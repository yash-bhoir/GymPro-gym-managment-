
import os
import random
import string
import asyncio
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import jwt, JWTError
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from bson import ObjectId
import httpx
import smtplib
import ssl
from email.mime.text import MIMEText
from dotenv import load_dotenv
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

load_dotenv()

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
SECRET_KEY = os.environ["SECRET_KEY"]
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
SMTP_EMAIL = os.environ.get("SMTP_EMAIL")
SMTP_APP_PASSWORD = os.environ.get("SMTP_APP_PASSWORD")
SMTP_ENABLED = os.environ.get("SMTP_ENABLED", "false").lower() == "true"
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")

ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7
OTP_EXPIRE_MINUTES = 10

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI(title="Gym Membership Management API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in CORS_ORIGINS.split(",")] if CORS_ORIGINS != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
admins_collection = db["admins"]
members_collection = db["members"]
packages_collection = db["packages"]
settings_collection = db["settings"]

scheduler = AsyncIOScheduler()

LOGIN_ATTEMPTS: Dict[str, List[datetime]] = {}


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(subject: str, token_type: str, token_version: int, expires_delta: timedelta) -> str:
    to_encode = {
        "sub": subject,
        "type": token_type,
        "token_version": token_version,
        "exp": datetime.utcnow() + expires_delta
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")


def decode_token(token: str, token_type: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        if payload.get("type") != token_type:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        return payload
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")


def generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))


def serialize_id(doc: dict) -> dict:
    if not doc:
        return doc
    doc["id"] = str(doc.pop("_id"))
    return doc


def parse_object_id(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")


class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    confirm_password: str


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str


class GoogleLoginRequest(BaseModel):
    id_token: str


class RefreshRequest(BaseModel):
    refresh_token: str


class PackageCreate(BaseModel):
    name: str
    duration_days: int
    price: float
    description: Optional[str] = ""


class PackageUpdate(BaseModel):
    name: Optional[str] = None
    duration_days: Optional[int] = None
    price: Optional[float] = None
    description: Optional[str] = None


class PaymentInfo(BaseModel):
    total_amount: float
    paid_amount: float
    remaining_amount: float
    status: str
    method: Optional[str] = None


class PaymentHistoryItem(BaseModel):
    amount: float
    method: Optional[str] = None
    transaction_id: Optional[str] = None
    payment_date: datetime
    note: Optional[str] = None


class MemberCreate(BaseModel):
    full_name: str
    phone_number: str
    email: Optional[EmailStr] = None
    address: Optional[str] = ""
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    emergency_contact: Optional[str] = None
    joining_date: datetime
    package_id: str
    payment_method: Optional[str] = None
    paid_amount: float = 0


class MemberUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    emergency_contact: Optional[str] = None
    joining_date: Optional[datetime] = None
    package_id: Optional[str] = None
    status: Optional[str] = None
    payment_method: Optional[str] = None
    paid_amount: Optional[float] = None


class AddPaymentRequest(BaseModel):
    amount: float
    method: str
    transaction_id: Optional[str] = None
    payment_date: Optional[datetime] = None
    note: Optional[str] = None


class ReminderSendRequest(BaseModel):
    member_id: str
    reminder_type: Optional[str] = None


class SMTPSettings(BaseModel):
    email: Optional[EmailStr] = None
    app_password: Optional[str] = None
    enabled: bool = False


class WhatsAppSettings(BaseModel):
    access_token: Optional[str] = None
    phone_number_id: Optional[str] = None
    business_id: Optional[str] = None
    enabled: bool = False


class ReminderSettings(BaseModel):
    days_before_expiry: List[int] = Field(default_factory=lambda: [1, 3, 7])
    reminder_type: str = "both"
    payment_pending_enabled: bool = True


class SettingsUpdateRequest(BaseModel):
    smtp: Optional[SMTPSettings] = None
    whatsapp: Optional[WhatsAppSettings] = None
    reminders: Optional[ReminderSettings] = None


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


async def send_email(to_email: str, subject: str, body: str, smtp_settings: SMTPSettings):
    if not smtp_settings.enabled or not smtp_settings.email or not smtp_settings.app_password:
        raise HTTPException(status_code=400, detail="Email reminders are not configured")

    def _send():
        message = MIMEText(body)
        message["Subject"] = subject
        message["From"] = smtp_settings.email
        message["To"] = to_email

        context = ssl.create_default_context()
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
            server.login(smtp_settings.email, smtp_settings.app_password)
            server.sendmail(smtp_settings.email, to_email, message.as_string())

    await asyncio.to_thread(_send)


async def send_whatsapp(to_phone: str, message: str, whatsapp_settings: WhatsAppSettings):
    if not whatsapp_settings.enabled or not whatsapp_settings.access_token or not whatsapp_settings.phone_number_id:
        raise HTTPException(status_code=400, detail="WhatsApp reminders are not configured")

    url = f"https://graph.facebook.com/v18.0/{whatsapp_settings.phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {whatsapp_settings.access_token}",
        "Content-Type": "application/json"
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "text",
        "text": {"body": message}
    }

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(url, headers=headers, json=payload)
        if response.status_code >= 400:
            raise HTTPException(status_code=400, detail=f"WhatsApp send failed: {response.text}")


async def get_admin_settings(admin_id: ObjectId) -> dict:
    settings = await settings_collection.find_one({"admin_id": admin_id})
    if not settings:
        settings = {
            "admin_id": admin_id,
            "smtp": {"email": None, "app_password": None, "enabled": False},
            "whatsapp": {"access_token": None, "phone_number_id": None, "business_id": None, "enabled": False},
            "reminders": {"days_before_expiry": [1, 3, 7], "reminder_type": "both", "payment_pending_enabled": True}
        }
        await settings_collection.insert_one(settings)
    return settings


async def get_smtp_settings(admin_id: ObjectId) -> SMTPSettings:
    settings = await get_admin_settings(admin_id)
    smtp = settings.get("smtp", {})
    if smtp.get("enabled"):
        return SMTPSettings(**smtp)
    if SMTP_ENABLED and SMTP_EMAIL and SMTP_APP_PASSWORD:
        return SMTPSettings(email=SMTP_EMAIL, app_password=SMTP_APP_PASSWORD, enabled=True)
    return SMTPSettings(enabled=False)


async def get_whatsapp_settings(admin_id: ObjectId) -> WhatsAppSettings:
    settings = await get_admin_settings(admin_id)
    whatsapp = settings.get("whatsapp", {})
    return WhatsAppSettings(**whatsapp)


async def update_member_status(member: dict) -> dict:
    if not member.get("end_date"):
        return member
    now = datetime.utcnow()
    status_value = member.get("status", "Active")
    if member["end_date"] < now and status_value != "Expired":
        await members_collection.update_one({"_id": member["_id"]}, {"$set": {"status": "Expired"}})
        member["status"] = "Expired"
    return member


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_token(token, "access")
    user_id = payload.get("sub")
    user = await admins_collection.find_one({"_id": parse_object_id(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.get("token_version", 0) != payload.get("token_version"):
        raise HTTPException(status_code=401, detail="Token invalidated")
    return user


def record_login_attempt(email: str):
    now = datetime.utcnow()
    attempts = LOGIN_ATTEMPTS.get(email, [])
    attempts = [t for t in attempts if now - t < timedelta(minutes=10)]
    if len(attempts) >= 5:
        raise HTTPException(status_code=429, detail="Too many login attempts. Please try again later.")
    attempts.append(now)
    LOGIN_ATTEMPTS[email] = attempts


@app.post("/api/auth/register")
async def register(payload: RegisterRequest):
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    existing = await admins_collection.find_one({"email": payload.email})
    otp = generate_otp()
    otp_expiry = datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)

    if existing and existing.get("verified"):
        raise HTTPException(status_code=400, detail="Email already registered")

    data = {
        "full_name": payload.full_name,
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "verified": False,
        "otp_code": otp,
        "otp_expires_at": otp_expiry,
        "token_version": existing.get("token_version", 0) if existing else 0,
        "created_at": existing.get("created_at", datetime.utcnow()) if existing else datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    if existing:
        await admins_collection.update_one({"_id": existing["_id"]}, {"$set": data})
    else:
        await admins_collection.insert_one(data)

    smtp_settings = SMTPSettings(email=SMTP_EMAIL, app_password=SMTP_APP_PASSWORD, enabled=SMTP_ENABLED)
    await send_email(payload.email, "Your OTP Code", f"Your OTP is {otp}. It expires in 10 minutes.", smtp_settings)

    return {"message": "OTP sent to email"}


@app.post("/api/auth/verify-otp")
async def verify_otp(payload: VerifyOtpRequest):
    user = await admins_collection.find_one({"email": payload.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("otp_code") != payload.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    if user.get("otp_expires_at") < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP expired")

    await admins_collection.update_one({"_id": user["_id"]}, {"$set": {"verified": True, "otp_code": None, "otp_expires_at": None}})

    token_version = user.get("token_version", 0)
    access_token = create_token(str(user["_id"]), "access", token_version, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    refresh_token = create_token(str(user["_id"]), "refresh", token_version, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))

    return {"access_token": access_token, "refresh_token": refresh_token, "admin": serialize_id(user)}


@app.post("/api/auth/login")
async def login(payload: LoginRequest):
    record_login_attempt(payload.email)
    user = await admins_collection.find_one({"email": payload.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.get("verified"):
        raise HTTPException(status_code=403, detail="Account not verified")
    if not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token_version = user.get("token_version", 0)
    access_token = create_token(str(user["_id"]), "access", token_version, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    refresh_token = create_token(str(user["_id"]), "refresh", token_version, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))

    return {"access_token": access_token, "refresh_token": refresh_token, "admin": serialize_id(user)}


@app.post("/api/auth/google")
async def google_login(payload: GoogleLoginRequest):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Google client ID not configured")

    try:
        id_info = google_id_token.verify_oauth2_token(payload.id_token, google_requests.Request(), GOOGLE_CLIENT_ID)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    email = id_info.get("email")
    full_name = id_info.get("name") or "Google User"
    google_sub = id_info.get("sub")

    user = await admins_collection.find_one({"email": email})
    if user:
        await admins_collection.update_one({"_id": user["_id"]}, {"$set": {"verified": True, "google_sub": google_sub}})
    else:
        user_data = {
            "full_name": full_name,
            "email": email,
            "password_hash": None,
            "verified": True,
            "google_sub": google_sub,
            "token_version": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        result = await admins_collection.insert_one(user_data)
        user = await admins_collection.find_one({"_id": result.inserted_id})

    token_version = user.get("token_version", 0)
    access_token = create_token(str(user["_id"]), "access", token_version, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    refresh_token = create_token(str(user["_id"]), "refresh", token_version, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))

    return {"access_token": access_token, "refresh_token": refresh_token, "admin": serialize_id(user)}


@app.post("/api/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    user = await admins_collection.find_one({"email": payload.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    otp = generate_otp()
    otp_expiry = datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)
    await admins_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"otp_code": otp, "otp_expires_at": otp_expiry}}
    )

    smtp_settings = SMTPSettings(email=SMTP_EMAIL, app_password=SMTP_APP_PASSWORD, enabled=SMTP_ENABLED)
    await send_email(payload.email, "Password Reset OTP", f"Your OTP is {otp}. It expires in 10 minutes.", smtp_settings)

    return {"message": "OTP sent"}


@app.post("/api/auth/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    user = await admins_collection.find_one({"email": payload.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("otp_code") != payload.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    if user.get("otp_expires_at") < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP expired")

    new_hash = hash_password(payload.new_password)
    token_version = user.get("token_version", 0) + 1

    await admins_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": new_hash, "token_version": token_version, "otp_code": None, "otp_expires_at": None}}
    )

    return {"message": "Password updated"}


@app.post("/api/auth/refresh")
async def refresh_token(payload: RefreshRequest):
    token_payload = decode_token(payload.refresh_token, "refresh")
    user_id = token_payload.get("sub")
    user = await admins_collection.find_one({"_id": parse_object_id(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("token_version", 0) != token_payload.get("token_version"):
        raise HTTPException(status_code=401, detail="Token invalidated")

    token_version = user.get("token_version", 0)
    access_token = create_token(str(user["_id"]), "access", token_version, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return {"access_token": access_token}


@app.get("/api/auth/me")
async def get_me(current_user=Depends(get_current_user)):
    return {"admin": serialize_id(current_user)}


@app.post("/api/packages")
async def create_package(payload: PackageCreate, current_user=Depends(get_current_user)):
    data = payload.dict()
    data.update({"created_by": current_user["_id"], "created_at": datetime.utcnow()})
    result = await packages_collection.insert_one(data)
    package = await packages_collection.find_one({"_id": result.inserted_id})
    return {"package": serialize_id(package)}


@app.get("/api/packages")
async def list_packages(current_user=Depends(get_current_user)):
    packages = []
    async for package in packages_collection.find({"created_by": current_user["_id"]}):
        packages.append(serialize_id(package))
    return {"packages": packages}


@app.put("/api/packages/{package_id}")
async def update_package(package_id: str, payload: PackageUpdate, current_user=Depends(get_current_user)):
    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    if update_data:
        await packages_collection.update_one({"_id": parse_object_id(package_id), "created_by": current_user["_id"]}, {"$set": update_data})
    package = await packages_collection.find_one({"_id": parse_object_id(package_id), "created_by": current_user["_id"]})
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    return {"package": serialize_id(package)}


@app.delete("/api/packages/{package_id}")
async def delete_package(package_id: str, current_user=Depends(get_current_user)):
    result = await packages_collection.delete_one({"_id": parse_object_id(package_id), "created_by": current_user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Package not found")
    return {"message": "Package deleted"}


@app.post("/api/members")
async def create_member(payload: MemberCreate, current_user=Depends(get_current_user)):
    package = await packages_collection.find_one({"_id": parse_object_id(payload.package_id), "created_by": current_user["_id"]})
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")

    start_date = payload.joining_date
    end_date = start_date + timedelta(days=package["duration_days"])
    total_amount = package["price"]
    paid_amount = payload.paid_amount
    remaining_amount = max(total_amount - paid_amount, 0)
    payment_status = "Fully Paid" if remaining_amount == 0 else ("Partially Paid" if paid_amount > 0 else "Pending")

    member = {
        "full_name": payload.full_name,
        "phone_number": payload.phone_number,
        "email": payload.email,
        "address": payload.address,
        "date_of_birth": payload.date_of_birth,
        "gender": payload.gender,
        "emergency_contact": payload.emergency_contact,
        "joining_date": payload.joining_date,
        "package_id": package["_id"],
        "package_name": package["name"],
        "start_date": start_date,
        "end_date": end_date,
        "status": "Active",
        "payment": {
            "total_amount": total_amount,
            "paid_amount": paid_amount,
            "remaining_amount": remaining_amount,
            "status": payment_status,
            "method": payload.payment_method
        },
        "payment_history": [],
        "created_by": current_user["_id"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    result = await members_collection.insert_one(member)
    created = await members_collection.find_one({"_id": result.inserted_id})
    created = await update_member_status(created)
    return {"member": serialize_id(created)}


@app.get("/api/members")
async def list_members(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    payment_status: Optional[str] = None,
    sort_by: Optional[str] = "end_date",
    sort_dir: Optional[int] = 1,
    page: int = 1,
    page_size: int = 10,
    current_user=Depends(get_current_user)
):
    query: Dict[str, Any] = {"created_by": current_user["_id"]}
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"phone_number": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    if status_filter:
        query["status"] = status_filter
    if payment_status:
        query["payment.status"] = payment_status

    total = await members_collection.count_documents(query)
    cursor = members_collection.find(query).sort(sort_by, sort_dir).skip((page - 1) * page_size).limit(page_size)
    members = []
    async for member in cursor:
        member = await update_member_status(member)
        members.append(serialize_id(member))

    return {"members": members, "total": total, "page": page, "page_size": page_size}


@app.get("/api/members/{member_id}")
async def get_member(member_id: str, current_user=Depends(get_current_user)):
    member = await members_collection.find_one({"_id": parse_object_id(member_id), "created_by": current_user["_id"]})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    member = await update_member_status(member)
    return {"member": serialize_id(member)}


@app.put("/api/members/{member_id}")
async def update_member(member_id: str, payload: MemberUpdate, current_user=Depends(get_current_user)):
    member = await members_collection.find_one({"_id": parse_object_id(member_id), "created_by": current_user["_id"]})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    update_data = {k: v for k, v in payload.dict().items() if v is not None}

    if "package_id" in update_data:
        package = await packages_collection.find_one({"_id": parse_object_id(update_data["package_id"]), "created_by": current_user["_id"]})
        if not package:
            raise HTTPException(status_code=404, detail="Package not found")
        start_date = update_data.get("joining_date") or member.get("joining_date")
        update_data["package_name"] = package["name"]
        update_data["start_date"] = start_date
        update_data["end_date"] = start_date + timedelta(days=package["duration_days"])
        update_data["payment.total_amount"] = package["price"]

    if "paid_amount" in update_data:
        paid_amount = update_data["paid_amount"]
        total_amount = member["payment"]["total_amount"]
        remaining = max(total_amount - paid_amount, 0)
        status_value = "Fully Paid" if remaining == 0 else ("Partially Paid" if paid_amount > 0 else "Pending")
        await members_collection.update_one({"_id": member["_id"]}, {"$set": {"payment.paid_amount": paid_amount, "payment.remaining_amount": remaining, "payment.status": status_value}})
        update_data.pop("paid_amount", None)

    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await members_collection.update_one({"_id": member["_id"]}, {"$set": update_data})

    updated = await members_collection.find_one({"_id": member["_id"]})
    updated = await update_member_status(updated)
    return {"member": serialize_id(updated)}


@app.delete("/api/members/{member_id}")
async def delete_member(member_id: str, current_user=Depends(get_current_user)):
    result = await members_collection.delete_one({"_id": parse_object_id(member_id), "created_by": current_user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"message": "Member deleted"}


@app.post("/api/members/{member_id}/payments")
async def add_payment(member_id: str, payload: AddPaymentRequest, current_user=Depends(get_current_user)):
    member = await members_collection.find_one({"_id": parse_object_id(member_id), "created_by": current_user["_id"]})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    payment = member.get("payment", {})
    paid_amount = payment.get("paid_amount", 0) + payload.amount
    total_amount = payment.get("total_amount", 0)
    remaining = max(total_amount - paid_amount, 0)
    status_value = "Fully Paid" if remaining == 0 else ("Partially Paid" if paid_amount > 0 else "Pending")

    history_item = {
        "amount": payload.amount,
        "method": payload.method,
        "transaction_id": payload.transaction_id,
        "payment_date": payload.payment_date or datetime.utcnow(),
        "note": payload.note
    }

    await members_collection.update_one(
        {"_id": member["_id"]},
        {
            "$set": {
                "payment.paid_amount": paid_amount,
                "payment.remaining_amount": remaining,
                "payment.status": status_value,
                "payment.method": payload.method
            },
            "$push": {"payment_history": history_item}
        }
    )

    updated = await members_collection.find_one({"_id": member["_id"]})
    updated = await update_member_status(updated)
    return {"member": serialize_id(updated)}


@app.get("/api/members/{member_id}/payments")
async def get_payment_history(member_id: str, current_user=Depends(get_current_user)):
    member = await members_collection.find_one({"_id": parse_object_id(member_id), "created_by": current_user["_id"]})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    history = member.get("payment_history", [])
    return {"payment_history": history}


@app.get("/api/dashboard/summary")
async def dashboard_summary(current_user=Depends(get_current_user)):
    total_members = await members_collection.count_documents({"created_by": current_user["_id"]})
    active_members = await members_collection.count_documents({"created_by": current_user["_id"], "status": "Active"})
    expired_members = await members_collection.count_documents({"created_by": current_user["_id"], "status": "Expired"})
    pending_payments = await members_collection.count_documents({"created_by": current_user["_id"], "payment.status": {"$ne": "Fully Paid"}})

    total_revenue = 0
    monthly_revenue = {i: 0 for i in range(1, 13)}
    upcoming_expirations = []
    now = datetime.utcnow()
    upcoming_limit = now + timedelta(days=7)

    async for member in members_collection.find({"created_by": current_user["_id"]}):
        member = await update_member_status(member)
        payment = member.get("payment", {})
        total_revenue += payment.get("paid_amount", 0)

        for item in member.get("payment_history", []):
            date = item.get("payment_date")
            if isinstance(date, str):
                date = datetime.fromisoformat(date)
            if date and date.year == now.year:
                monthly_revenue[date.month] += item.get("amount", 0)

        if member.get("end_date") and now <= member["end_date"] <= upcoming_limit:
            upcoming_expirations.append({
                "id": str(member["_id"]),
                "full_name": member.get("full_name"),
                "end_date": member.get("end_date"),
                "phone_number": member.get("phone_number"),
                "status": member.get("status")
            })

    revenue_list = [{"month": month, "value": monthly_revenue[month]} for month in range(1, 13)]

    return {
        "total_members": total_members,
        "active_members": active_members,
        "expired_members": expired_members,
        "pending_payments": pending_payments,
        "total_revenue": total_revenue,
        "monthly_revenue": revenue_list,
        "upcoming_expirations": upcoming_expirations
    }


@app.get("/api/settings")
async def get_settings(current_user=Depends(get_current_user)):
    settings = await get_admin_settings(current_user["_id"])
    settings["id"] = str(settings.pop("_id"))
    settings["admin_id"] = str(settings["admin_id"])
    return {"settings": settings}


@app.put("/api/settings")
async def update_settings(payload: SettingsUpdateRequest, current_user=Depends(get_current_user)):
    settings = await get_admin_settings(current_user["_id"])
    update_data = {}
    if payload.smtp is not None:
        update_data["smtp"] = payload.smtp.dict()
    if payload.whatsapp is not None:
        update_data["whatsapp"] = payload.whatsapp.dict()
    if payload.reminders is not None:
        update_data["reminders"] = payload.reminders.dict()

    if update_data:
        await settings_collection.update_one({"_id": settings["_id"]}, {"$set": update_data})
    updated = await get_admin_settings(current_user["_id"])
    updated["id"] = str(updated.pop("_id"))
    updated["admin_id"] = str(updated["admin_id"])
    return {"settings": updated}


@app.put("/api/settings/profile")
async def update_profile(payload: ProfileUpdateRequest, current_user=Depends(get_current_user)):
    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    if update_data:
        await admins_collection.update_one({"_id": current_user["_id"]}, {"$set": update_data})
    updated = await admins_collection.find_one({"_id": current_user["_id"]})
    return {"admin": serialize_id(updated)}


@app.put("/api/settings/password")
async def update_password(payload: PasswordChangeRequest, current_user=Depends(get_current_user)):
    if not current_user.get("password_hash"):
        raise HTTPException(status_code=400, detail="Password not set for this account")
    if not verify_password(payload.current_password, current_user.get("password_hash")):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    new_hash = hash_password(payload.new_password)
    token_version = current_user.get("token_version", 0) + 1
    await admins_collection.update_one({"_id": current_user["_id"]}, {"$set": {"password_hash": new_hash, "token_version": token_version}})
    return {"message": "Password updated"}


@app.post("/api/reminders/send")
async def send_reminder(payload: ReminderSendRequest, current_user=Depends(get_current_user)):
    member = await members_collection.find_one({"_id": parse_object_id(payload.member_id), "created_by": current_user["_id"]})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    settings = await get_admin_settings(current_user["_id"])
    reminder_type = payload.reminder_type or settings.get("reminders", {}).get("reminder_type", "both")
    message = f"Hello {member.get('full_name')}, this is a reminder about your gym membership."

    if reminder_type in ["email", "both"]:
        smtp = await get_smtp_settings(current_user["_id"])
        if member.get("email"):
            await send_email(member["email"], "Gym Reminder", message, smtp)

    if reminder_type in ["whatsapp", "both"]:
        whatsapp = await get_whatsapp_settings(current_user["_id"])
        await send_whatsapp(member["phone_number"], message, whatsapp)

    return {"message": "Reminder sent"}


async def run_daily_reminders():
    now = datetime.utcnow()
    async for admin in admins_collection.find({"verified": True}):
        settings = await get_admin_settings(admin["_id"])
        reminder_settings = settings.get("reminders", {})
        days_before = reminder_settings.get("days_before_expiry", [1, 3, 7])
        reminder_type = reminder_settings.get("reminder_type", "both")
        payment_pending_enabled = reminder_settings.get("payment_pending_enabled", True)

        async for member in members_collection.find({"created_by": admin["_id"]}):
            member = await update_member_status(member)
            end_date = member.get("end_date")
            if not end_date:
                continue
            days_left = (end_date - now).days
            message = None

            if days_left in days_before:
                message = f"Hello {member.get('full_name')}, your membership expires on {end_date.date()}."
            elif payment_pending_enabled and member.get("payment", {}).get("status") != "Fully Paid":
                message = f"Hello {member.get('full_name')}, you have a pending payment of {member.get('payment', {}).get('remaining_amount', 0)}."

            if message:
                if reminder_type in ["email", "both"] and member.get("email"):
                    smtp = await get_smtp_settings(admin["_id"])
                    try:
                        await send_email(member["email"], "Gym Reminder", message, smtp)
                    except Exception:
                        pass
                if reminder_type in ["whatsapp", "both"]:
                    whatsapp = await get_whatsapp_settings(admin["_id"])
                    try:
                        await send_whatsapp(member["phone_number"], message, whatsapp)
                    except Exception:
                        pass


@app.on_event("startup")
async def startup_event():
    scheduler.add_job(run_daily_reminders, CronTrigger(hour=9, minute=0))
    scheduler.start()


@app.on_event("shutdown")
async def shutdown_event():
    scheduler.shutdown()

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.auth import FirebaseTokenResponse, LoginRequest, SignupRequest, TokenResponse
from app.services.auth_service import authenticate_user, create_user, generate_token
from app.services.firebase_service import FirebaseUnavailableError, create_custom_token_for_user
from app.utils.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, body.email, body.password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return generate_token(user)


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)):
    try:
        user = await create_user(db, body.name, body.email, body.password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    return generate_token(user)


@router.post("/firebase-token", response_model=FirebaseTokenResponse)
async def firebase_token(current_user: User = Depends(get_current_user)):
    try:
        token, firebase_uid = await create_custom_token_for_user(current_user)
    except FirebaseUnavailableError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    return FirebaseTokenResponse(firebase_token=token, firebase_uid=firebase_uid, enabled=True)

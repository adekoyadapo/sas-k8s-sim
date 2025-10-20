from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Integer, String, DateTime, ForeignKey, func
from .user import Base


class UserSetting(Base):
    __tablename__ = "user_settings"

    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    theme: Mapped[str | None] = mapped_column(String(16))
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

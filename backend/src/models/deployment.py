import uuid as _uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, DateTime, func, Integer, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from .user import Base


class Deployment(Base):
    __tablename__ = "deployments"

    id: Mapped[_uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid.uuid4)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    display_name: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(255))
    namespace: Mapped[str] = mapped_column(String(255))
    unique_id: Mapped[str] = mapped_column(String(16))
    ingress_host: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(32), default="PENDING")
    last_error: Mapped[str | None] = mapped_column(Text())
    server_type: Mapped[str | None] = mapped_column(String(32))
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="deployments")

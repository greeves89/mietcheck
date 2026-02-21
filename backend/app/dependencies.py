# Re-export common dependencies
from app.core.auth import get_current_user, get_admin_user, get_premium_user
from app.database import get_db

__all__ = ["get_current_user", "get_admin_user", "get_premium_user", "get_db"]

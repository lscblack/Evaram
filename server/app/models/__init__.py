"""Import every model so Alembic's autogenerate sees the full metadata."""

from app.models.content import (  # noqa: F401
    AuditLog,
    BlockedDate,
    Booking,
    BookingStatus,
    ConstructionPackage,
    ConsultationType,
    ContactMessage,
    ContentBlock,
    Faq,
    Insight,
    JobApplication,
    MarketStat,
    NavigationItem,
    NewsletterSubscriber,
    ServiceLine,
    SettingType,
    SiteSetting,
    Testimonial,
    UiString,
    WealthCycleStep,
)
from app.models.property import (  # noqa: F401
    ListingIntent,
    MediaKind,
    Property,
    PropertyEnquiry,
    PropertyMedia,
    PropertyStatus,
    UploaderType,
)
from app.models.taxonomy import (  # noqa: F401
    District,
    FieldType,
    FieldWidth,
    OptionSet,
    PropertyCategory,
    PropertyFormField,
    PropertySubCategory,
)
from app.models.user import (  # noqa: F401
    CaptchaChallenge,
    OtpCode,
    OtpPurpose,
    RefreshToken,
    User,
    UserRole,
    UserStatus,
)

__all__ = [
    "AuditLog", "BlockedDate", "Booking", "BookingStatus", "CaptchaChallenge",
    "ConstructionPackage", "ConsultationType", "ContactMessage", "ContentBlock",
    "District", "Faq", "FieldType", "FieldWidth", "Insight", "JobApplication",
    "ListingIntent", "MarketStat", "MediaKind", "NavigationItem",
    "NewsletterSubscriber", "OptionSet", "OtpCode", "OtpPurpose", "Property",
    "PropertyCategory", "PropertyEnquiry", "PropertyFormField", "PropertyMedia",
    "PropertyStatus", "PropertySubCategory", "RefreshToken", "ServiceLine",
    "SettingType", "SiteSetting", "Testimonial", "UiString", "UploaderType",
    "User", "UserRole", "UserStatus", "WealthCycleStep",
]
from app.models.locality import (  # noqa: F401
    Locality,
    LocalityLevel,
)
from app.models.facility import (  # noqa: F401
    CONSTRAINT_KINDS,
    Facility,
    FacilityKind,
)
from app.models import crm  # noqa: F401 — registers Client, Commission, Investment

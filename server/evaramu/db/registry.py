"""Imports every model so ``Base.metadata`` is complete (Alembic, tests)."""

from evaramu.db.base import Base
from evaramu.modules.agreements import models as _agreements  # noqa: F401
from evaramu.modules.billing import models as _billing  # noqa: F401
from evaramu.modules.identity import models as _identity  # noqa: F401
from evaramu.modules.properties import models as _properties  # noqa: F401
from evaramu.modules.system import models as _system  # noqa: F401
from evaramu.modules.tenants import models as _tenants  # noqa: F401

metadata = Base.metadata

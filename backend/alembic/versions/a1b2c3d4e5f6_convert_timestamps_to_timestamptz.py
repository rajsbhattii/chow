"""convert_timestamps_to_timestamptz

Revision ID: a1b2c3d4e5f6
Revises: e3307ddaec12
Create Date: 2026-07-11 12:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'e3307ddaec12'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE swipes ALTER COLUMN swiped_at TYPE TIMESTAMPTZ USING swiped_at AT TIME ZONE 'UTC'")
    op.execute("ALTER TABLE saves ALTER COLUMN saved_at TYPE TIMESTAMPTZ USING saved_at AT TIME ZONE 'UTC'")
    op.execute("ALTER TABLE saves ALTER COLUMN picked_at TYPE TIMESTAMPTZ USING picked_at AT TIME ZONE 'UTC'")
    op.execute("ALTER TABLE saves ALTER COLUMN snoozed_until TYPE TIMESTAMPTZ USING snoozed_until AT TIME ZONE 'UTC'")
    op.execute("ALTER TABLE users ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC'")
    op.execute("ALTER TABLE restaurants ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC'")
    op.execute("ALTER TABLE password_resets ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING expires_at AT TIME ZONE 'UTC'")
    op.execute("ALTER TABLE password_resets ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC'")
    op.execute("ALTER TABLE visits ALTER COLUMN visited_at TYPE TIMESTAMPTZ USING visited_at AT TIME ZONE 'UTC'")


def downgrade() -> None:
    op.execute("ALTER TABLE swipes ALTER COLUMN swiped_at TYPE TIMESTAMP USING swiped_at AT TIME ZONE 'UTC'")
    op.execute("ALTER TABLE saves ALTER COLUMN saved_at TYPE TIMESTAMP USING saved_at AT TIME ZONE 'UTC'")
    op.execute("ALTER TABLE saves ALTER COLUMN picked_at TYPE TIMESTAMP USING picked_at AT TIME ZONE 'UTC'")
    op.execute("ALTER TABLE saves ALTER COLUMN snoozed_until TYPE TIMESTAMP USING snoozed_until AT TIME ZONE 'UTC'")
    op.execute("ALTER TABLE users ALTER COLUMN created_at TYPE TIMESTAMP USING created_at AT TIME ZONE 'UTC'")
    op.execute("ALTER TABLE restaurants ALTER COLUMN created_at TYPE TIMESTAMP USING created_at AT TIME ZONE 'UTC'")
    op.execute("ALTER TABLE password_resets ALTER COLUMN expires_at TYPE TIMESTAMP USING expires_at AT TIME ZONE 'UTC'")
    op.execute("ALTER TABLE password_resets ALTER COLUMN created_at TYPE TIMESTAMP USING created_at AT TIME ZONE 'UTC'")
    op.execute("ALTER TABLE visits ALTER COLUMN visited_at TYPE TIMESTAMP USING visited_at AT TIME ZONE 'UTC'")

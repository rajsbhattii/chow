"""add_indexes_visits_swipes

Revision ID: e3307ddaec12
Revises: 175aaf8c90af
Create Date: 2026-07-11 12:31:33.679082

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e3307ddaec12'
down_revision: Union[str, None] = '175aaf8c90af'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('ix_visits_user_id', 'visits', ['user_id'])
    op.create_index('ix_swipes_user_id_swiped_at', 'swipes', ['user_id', 'swiped_at'])


def downgrade() -> None:
    op.drop_index('ix_swipes_user_id_swiped_at', table_name='swipes')
    op.drop_index('ix_visits_user_id', table_name='visits')

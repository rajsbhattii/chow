"""add place_types to restaurants

Revision ID: b84cadf5d8d1
Revises: 5cecffa827f5
Create Date: 2026-06-30 23:26:25.057659

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b84cadf5d8d1'
down_revision: Union[str, None] = '5cecffa827f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('restaurants', sa.Column('place_types', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('restaurants', 'place_types')

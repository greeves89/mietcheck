"""Add document_path to utility_bills

Revision ID: 004
Revises: 003
Create Date: 2026-02-22
"""
from alembic import op
import sqlalchemy as sa

revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('utility_bills', sa.Column('document_path', sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column('utility_bills', 'document_path')

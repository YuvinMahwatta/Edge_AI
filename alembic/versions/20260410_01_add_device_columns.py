"""add device_id columns to sensor readings and alerts

Revision ID: 20260410_01
Revises:
Create Date: 2026-04-10
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20260410_01"
down_revision = None
branch_labels = None
depends_on = None


def _table_exists(bind, table_name: str) -> bool:
    inspector = inspect(bind)
    return table_name in inspector.get_table_names()


def _column_exists(bind, table_name: str, column_name: str) -> bool:
    inspector = inspect(bind)
    return column_name in {col["name"] for col in inspector.get_columns(table_name)}


def upgrade() -> None:
    bind = op.get_bind()

    if _table_exists(bind, "sensor_readings") and not _column_exists(bind, "sensor_readings", "device_id"):
        op.add_column("sensor_readings", sa.Column("device_id", sa.String(length=100), nullable=True, server_default="device-001"))
        op.create_index(op.f("ix_sensor_readings_device_id"), "sensor_readings", ["device_id"], unique=False)
        op.execute("UPDATE sensor_readings SET device_id = 'device-001' WHERE device_id IS NULL")
        op.alter_column("sensor_readings", "device_id", nullable=False, server_default=None)

    if _table_exists(bind, "alerts") and not _column_exists(bind, "alerts", "device_id"):
        op.add_column("alerts", sa.Column("device_id", sa.String(length=100), nullable=True, server_default="device-001"))
        op.create_index(op.f("ix_alerts_device_id"), "alerts", ["device_id"], unique=False)
        op.execute("UPDATE alerts SET device_id = 'device-001' WHERE device_id IS NULL")
        op.alter_column("alerts", "device_id", nullable=False, server_default=None)


def downgrade() -> None:
    bind = op.get_bind()

    if _table_exists(bind, "alerts") and _column_exists(bind, "alerts", "device_id"):
        op.drop_index(op.f("ix_alerts_device_id"), table_name="alerts")
        op.drop_column("alerts", "device_id")

    if _table_exists(bind, "sensor_readings") and _column_exists(bind, "sensor_readings", "device_id"):
        op.drop_index(op.f("ix_sensor_readings_device_id"), table_name="sensor_readings")
        op.drop_column("sensor_readings", "device_id")

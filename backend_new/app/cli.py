import click
from werkzeug.security import generate_password_hash

from app.extensions import db
from app.models.user import User


def register_cli(app):

    @app.cli.command("create-superadmin")
    @click.option("--username", prompt=True)
    @click.option("--password", prompt=True, hide_input=True, confirmation_prompt=True)
    def create_superadmin(username, password):
        """Create the first system super-admin (no business)."""

        existing = User.query.filter_by(username=username).first()
        if existing:
            click.echo("❌ Ese username ya existe.")
            return

        superadmin = User(
            username=username,
            password_hash=generate_password_hash(password),
            is_superadmin=True,
            business_id=None,
        )

        db.session.add(superadmin)
        db.session.commit()
        click.echo("✅ Super Admin creado correctamente.")

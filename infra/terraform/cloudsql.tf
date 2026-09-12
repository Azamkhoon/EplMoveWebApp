# Cloud SQL for PostgreSQL — schema-per-service + RLS.
#
# RLS NOTE (critical): Postgres superusers bypass RLS even with FORCE ROW LEVEL
# SECURITY. So services connect as the NON-superuser `epl_app` role; migrations
# run as the owner `epl`. Cloud SQL's default `postgres` user is effectively
# superuser-like, so we never let services use it.

resource "random_password" "db_owner" {
  length  = 32
  special = false
}

resource "random_password" "db_app" {
  length  = 32
  special = false
}

resource "google_sql_database_instance" "main" {
  name             = "epl-move-${var.env}"
  database_version = "POSTGRES_16"
  region           = var.region
  depends_on       = [google_project_service.enabled, google_service_networking_connection.psa]

  settings {
    tier              = var.db_tier
    availability_type = var.env == "prod" ? "REGIONAL" : "ZONAL"
    disk_autoresize   = true

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
    }

    ip_configuration {
      ipv4_enabled = false
      # Private IP only; services reach it over the VPC connector / private path.
      private_network = google_compute_network.vpc.id
    }

    database_flags {
      name  = "cloudsql.iam_authentication"
      value = "on"
    }
  }

  deletion_protection = var.env == "prod"
}

resource "google_sql_database" "app" {
  name     = "epl_move"
  instance = google_sql_database_instance.main.name
}

# Owner role: runs DDL / migrations.
resource "google_sql_user" "owner" {
  name     = "epl"
  instance = google_sql_database_instance.main.name
  password = random_password.db_owner.result
}

# Non-superuser application role: what every service connects as (RLS applies).
resource "google_sql_user" "app" {
  name     = "epl_app"
  instance = google_sql_database_instance.main.name
  password = random_password.db_app.result
}

# Persist the app credentials in Secret Manager for Cloud Run injection.
resource "google_secret_manager_secret" "db_app_password" {
  secret_id = "epl-${var.env}-db-app-password"
  replication {
    auto {}
  }
  depends_on = [google_project_service.enabled]
}

resource "google_secret_manager_secret_version" "db_app_password" {
  secret      = google_secret_manager_secret.db_app_password.id
  secret_data = random_password.db_app.result
}

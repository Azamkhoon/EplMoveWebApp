# One service account per Cloud Run service (least privilege).
locals {
  all_services = concat(var.db_services, var.stateless_services, ["api-gateway"])
}

resource "google_service_account" "svc" {
  for_each     = toset(local.all_services)
  account_id   = "epl-${var.env}-${each.value}"
  display_name = "EPL ${var.env} ${each.value}"
}

# DB-owning services: Cloud SQL client + can read the DB app password secret.
resource "google_project_iam_member" "cloudsql_client" {
  for_each = toset(var.db_services)
  project  = var.project_id
  role     = "roles/cloudsql.client"
  member   = "serviceAccount:${google_service_account.svc[each.value].email}"
}

resource "google_secret_manager_secret_iam_member" "db_password_access" {
  for_each  = toset(var.db_services)
  secret_id = google_secret_manager_secret.db_app_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.svc[each.value].email}"
}

# Every service publishes and subscribes to Pub/Sub.
resource "google_project_iam_member" "pubsub_editor" {
  for_each = toset(local.all_services)
  project  = var.project_id
  role     = "roles/pubsub.editor"
  member   = "serviceAccount:${google_service_account.svc[each.value].email}"
}

# auth-svc + api-gateway read the JWT keys.
resource "google_secret_manager_secret_iam_member" "jwt_private_access" {
  for_each  = toset(["auth-svc"])
  secret_id = google_secret_manager_secret.jwt_private.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.svc[each.value].email}"
}

resource "google_secret_manager_secret_iam_member" "jwt_public_access" {
  for_each  = toset(["auth-svc", "api-gateway"])
  secret_id = google_secret_manager_secret.jwt_public.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.svc[each.value].email}"
}

# The gateway is the only public service; it may invoke the internal services.
resource "google_cloud_run_v2_service_iam_member" "gateway_invokes_internal" {
  for_each = toset(concat(var.db_services, var.stateless_services))
  project  = var.project_id
  location = var.region
  name     = each.value
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.svc["api-gateway"].email}"

  depends_on = [module.internal_services]
}

# The gateway itself is publicly invocable (behind the external LB / Cloud Armor).
resource "google_cloud_run_v2_service_iam_member" "gateway_public" {
  project  = var.project_id
  location = var.region
  name     = "api-gateway"
  role     = "roles/run.invoker"
  member   = "allUsers"

  depends_on = [module.gateway]
}

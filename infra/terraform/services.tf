# Per-service Cloud Run instances.
#
# Common DB connection env (services connect as the NON-superuser epl_app role
# via the Cloud SQL connector unix socket — RLS applies).
locals {
  db_common_env = {
    DB_HOST           = "/cloudsql/${google_sql_database_instance.main.connection_name}"
    DB_NAME           = google_sql_database.app.name
    DB_USER           = google_sql_user.app.name
    PUBSUB_PROJECT_ID = var.project_id
    NODE_ENV          = "production"
  }
  db_common_secret_env = {
    DB_PASSWORD = { secret = google_secret_manager_secret.db_app_password.secret_id, version = "latest" }
  }
}

# DB-owning internal services.
module "internal_services" {
  source   = "./modules/cloud_run_service"
  for_each = toset(var.db_services)

  name                  = each.value
  project_id            = var.project_id
  region                = var.region
  image                 = "${local.image_base}/${each.value}:${var.image_tag}"
  service_account_email = google_service_account.svc[each.value].email
  vpc_connector         = google_vpc_access_connector.main.id
  public                = false
  min_instances         = var.service_min_instances
  cloudsql_instance     = google_sql_database_instance.main.connection_name

  env = merge(local.db_common_env, {
    SERVICE_NAME = each.value
  })
  secret_env = merge(
    local.db_common_secret_env,
    each.value == "auth-svc" ? {
      JWT_PRIVATE_KEY = { secret = google_secret_manager_secret.jwt_private.secret_id, version = "latest" }
      JWT_PUBLIC_KEY  = { secret = google_secret_manager_secret.jwt_public.secret_id, version = "latest" }
    } : {}
  )
}

# Stateless services (genius-svc): no DB.
module "stateless_services" {
  source   = "./modules/cloud_run_service"
  for_each = toset(var.stateless_services)

  name                  = each.value
  project_id            = var.project_id
  region                = var.region
  image                 = "${local.image_base}/${each.value}:${var.image_tag}"
  service_account_email = google_service_account.svc[each.value].email
  vpc_connector         = google_vpc_access_connector.main.id
  public                = false
  min_instances         = var.service_min_instances

  env = {
    SERVICE_NAME      = each.value
    PUBSUB_PROJECT_ID = var.project_id
    NODE_ENV          = "production"
  }
}

# Public API gateway.
module "gateway" {
  source = "./modules/cloud_run_service"

  name                  = "api-gateway"
  project_id            = var.project_id
  region                = var.region
  image                 = "${local.image_base}/api-gateway:${var.image_tag}"
  service_account_email = google_service_account.svc["api-gateway"].email
  vpc_connector         = google_vpc_access_connector.main.id
  public                = true
  min_instances         = var.gateway_min_instances

  env = merge(
    {
      SERVICE_NAME      = "api-gateway"
      PUBSUB_PROJECT_ID = var.project_id
      NODE_ENV          = "production"
      REDIS_URL         = "redis://${google_redis_instance.cache.host}:${google_redis_instance.cache.port}"
    },
    # Internal service URLs for the BFF to proxy to.
    { for s in var.db_services : "${upper(replace(s, "-", "_"))}_URL" => module.internal_services[s].uri },
    { for s in var.stateless_services : "${upper(replace(s, "-", "_"))}_URL" => module.stateless_services[s].uri },
  )
  secret_env = {
    JWT_PUBLIC_KEY = { secret = google_secret_manager_secret.jwt_public.secret_id, version = "latest" }
  }
}

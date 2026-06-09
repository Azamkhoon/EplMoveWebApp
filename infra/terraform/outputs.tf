output "gateway_url" {
  value       = module.gateway.uri
  description = "Public API gateway URL (front this with the external HTTPS LB + Cloud Armor)."
}

output "artifact_registry" {
  value       = local.image_base
  description = "Docker image base path; push service images here as <base>/<svc>:<tag>."
}

output "cloudsql_connection_name" {
  value       = google_sql_database_instance.main.connection_name
  description = "Cloud SQL connection name for the connector / proxy."
}

output "internal_service_urls" {
  value = { for s, m in module.internal_services : s => m.uri }
}

output "pubsub_topics" {
  value = [for t in google_pubsub_topic.events : t.name]
}

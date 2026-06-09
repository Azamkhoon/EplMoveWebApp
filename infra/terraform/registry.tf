# Artifact Registry for service container images.
resource "google_artifact_registry_repository" "services" {
  location      = var.region
  repository_id = "epl-move-${var.env}"
  format        = "DOCKER"
  description   = "EPL Move service images"
  depends_on    = [google_project_service.enabled]
}

locals {
  image_base = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.services.repository_id}"
}

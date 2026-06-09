# VPC + private services access so Cloud Run reaches Cloud SQL / Memorystore
# over private IP, and a Serverless VPC connector for egress.
resource "google_compute_network" "vpc" {
  name                    = "epl-move-${var.env}"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.enabled]
}

resource "google_compute_subnetwork" "main" {
  name          = "epl-move-${var.env}-main"
  ip_cidr_range = "10.20.0.0/20"
  region        = var.region
  network       = google_compute_network.vpc.id
}

# Private Service Access range for Cloud SQL / Memorystore.
resource "google_compute_global_address" "private_range" {
  name          = "epl-move-${var.env}-psa"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "psa" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_range.name]
}

# Serverless VPC connector — Cloud Run egress into the VPC.
resource "google_vpc_access_connector" "main" {
  name          = "epl-${var.env}-vpc"
  region        = var.region
  network       = google_compute_network.vpc.name
  ip_cidr_range = "10.8.0.0/28"
  depends_on    = [google_project_service.enabled]
}

# Memorystore (Redis) for rate-limiting, idempotency, caching.
resource "google_redis_instance" "cache" {
  name               = "epl-move-${var.env}"
  tier               = var.env == "prod" ? "STANDARD_HA" : "BASIC"
  memory_size_gb     = 1
  region             = var.region
  authorized_network = google_compute_network.vpc.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"
  depends_on         = [google_service_networking_connection.psa]
}

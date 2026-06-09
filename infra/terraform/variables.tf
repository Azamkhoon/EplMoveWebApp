variable "project_id" {
  type        = string
  description = "GCP project id."
}

variable "region" {
  type        = string
  default     = "europe-west1"
  description = "Primary region for Cloud Run, Cloud SQL, Artifact Registry."
}

variable "env" {
  type        = string
  default     = "prod"
  description = "Environment name (prod, staging) — used in resource names."
}

variable "db_tier" {
  type        = string
  default     = "db-custom-2-7680"
  description = "Cloud SQL machine tier."
}

variable "image_tag" {
  type        = string
  default     = "latest"
  description = "Container image tag to deploy for every service."
}

variable "gateway_min_instances" {
  type    = number
  default = 1
}

variable "service_min_instances" {
  type    = number
  default = 0
}

# Services that own a DB schema (they get DB access + run migrations).
variable "db_services" {
  type = list(string)
  default = [
    "auth-svc", "tenant-svc", "load-svc", "carrier-svc", "quote-svc",
    "shipment-svc", "tracking-svc", "doc-svc", "billing-svc", "notify-svc",
  ]
}

# Stateless services (no DB).
variable "stateless_services" {
  type    = list(string)
  default = ["genius-svc"]
}

# Pub/Sub topics (mirror packages/contracts Events.Topics).
variable "topics" {
  type    = list(string)
  default = ["load.events", "quote.events", "shipment.events", "tracking.events", "doc.events", "billing.events", "notify.events", "audit.events"]
}

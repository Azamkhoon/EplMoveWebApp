variable "name" { type = string }
variable "project_id" { type = string }
variable "region" { type = string }
variable "image" { type = string }
variable "service_account_email" { type = string }
variable "vpc_connector" { type = string }

variable "public" {
  type        = bool
  default     = false
  description = "Public ingress (gateway only). Internal services are ingress=internal."
}

variable "min_instances" {
  type    = number
  default = 0
}

variable "max_instances" {
  type    = number
  default = 10
}

variable "env" {
  type        = map(string)
  default     = {}
  description = "Plain environment variables."
}

variable "secret_env" {
  type        = map(object({ secret = string, version = string }))
  default     = {}
  description = "Environment variables sourced from Secret Manager."
}

variable "cloudsql_instance" {
  type    = string
  default = ""
}

terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.40"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
  backend "gcs" {
    bucket = "epl-prod-tfstate"
    prefix = "env/prod"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# JWT signing keys (RS256). Create the secrets here; populate the versions out
# of band (or via the CI pipeline) — never commit private keys.
#
#   gcloud secrets versions add epl-${env}-jwt-private --data-file=jwt_private.pem
#   gcloud secrets versions add epl-${env}-jwt-public  --data-file=jwt_public.pem
resource "google_secret_manager_secret" "jwt_private" {
  secret_id = "epl-${var.env}-jwt-private"
  replication {
    auto {}
  }
  depends_on = [google_project_service.enabled]
}

resource "google_secret_manager_secret" "jwt_public" {
  secret_id = "epl-${var.env}-jwt-public"
  replication {
    auto {}
  }
  depends_on = [google_project_service.enabled]
}

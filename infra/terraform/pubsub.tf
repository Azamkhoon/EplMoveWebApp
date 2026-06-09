# Pub/Sub topics (mirror packages/contracts Events.Topics) + a shared dead-letter
# topic. Per-service pull subscriptions are created by the services at runtime
# (they call createSubscription), but the topics + DLQ are managed here.
resource "google_pubsub_topic" "events" {
  for_each   = toset(var.topics)
  name       = each.value
  depends_on = [google_project_service.enabled]
}

resource "google_pubsub_topic" "dead_letter" {
  name       = "epl-dead-letter"
  depends_on = [google_project_service.enabled]
}

# Allow the Pub/Sub service agent to publish to the DLQ (required for dead-lettering).
data "google_project" "this" {}

resource "google_pubsub_topic_iam_member" "dlq_publisher" {
  topic  = google_pubsub_topic.dead_letter.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:service-${data.google_project.this.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

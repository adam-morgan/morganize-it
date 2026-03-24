// DNS & Domain Configuration
// ===========================
// Custom domain setup for notes.adammorgan.ca (GoDaddy)
//
// Pre-requisites (one-time manual setup):
//
// 1. Request ACM certificates:
//    - us-east-1 for CloudFront (static site): notes.adammorgan.ca
//    - ca-central-1 for API Gateway: api.notes.adammorgan.ca
//
// 2. Validate both certs via DNS validation (add CNAME records in GoDaddy)
//
// 3. Update cert ARNs in:
//    - infra/web.ts: replace REPLACE_WITH_ACM_CERT_ARN_US_EAST_1
//    - infra/api.ts: replace REPLACE_WITH_ACM_CERT_ARN_CA_CENTRAL_1
//
// 4. After `sst deploy --stage prod`, add CNAME records in GoDaddy:
//    - notes -> <cloudfront-distribution>.cloudfront.net
//    - api.notes -> <api-gateway-domain>.execute-api.ca-central-1.amazonaws.com
//
// For local dev (sst dev), domain config is not needed.

export {};

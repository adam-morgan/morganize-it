#!/bin/bash
#
# One-time setup of the IAM OIDC provider and role that GitHub Actions assumes to deploy prod.
# Safe to re-run.

set -euo pipefail

PROFILE="${AWS_PROFILE:-personal}"
ACCOUNT_ID="499854674714"
REPO="adam-morgan/morganize-it"
ROLE_NAME="github-deploy-morganize-it"
OIDC_HOST="token.actions.githubusercontent.com"
OIDC_ARN="arn:aws:iam::${ACCOUNT_ID}:oidc-provider/${OIDC_HOST}"

CALLER_ACCOUNT="$(aws sts get-caller-identity --profile "${PROFILE}" --query Account --output text)"

if [ "${CALLER_ACCOUNT}" != "${ACCOUNT_ID}" ]; then
    echo "Profile ${PROFILE} is for account ${CALLER_ACCOUNT}, expected ${ACCOUNT_ID}" >&2
    exit 1
fi

TRUST_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Federated": "${OIDC_ARN}" },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "${OIDC_HOST}:aud": "sts.amazonaws.com",
          "${OIDC_HOST}:sub": "repo:${REPO}:ref:refs/heads/main"
        }
      }
    }
  ]
}
EOF
)

IAM_ROLES_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole",
        "iam:DeleteRole",
        "iam:GetRole",
        "iam:UpdateRole",
        "iam:TagRole",
        "iam:UntagRole",
        "iam:PassRole",
        "iam:PutRolePolicy",
        "iam:GetRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:ListRolePolicies",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy",
        "iam:ListAttachedRolePolicies",
        "iam:ListInstanceProfilesForRole",
        "iam:UpdateAssumeRolePolicy"
      ],
      "Resource": [
        "arn:aws:iam::${ACCOUNT_ID}:role/morganize-it-*",
        "arn:aws:iam::${ACCOUNT_ID}:role/APIGatewayPushToCloudWatchLogsRole-*"
      ]
    }
  ]
}
EOF
)

if aws iam get-open-id-connect-provider --profile "${PROFILE}" --open-id-connect-provider-arn "${OIDC_ARN}" >/dev/null 2>&1; then
    echo "OIDC provider already exists"
else
    echo "Creating OIDC provider"
    aws iam create-open-id-connect-provider --profile "${PROFILE}" \
        --url "https://${OIDC_HOST}" \
        --client-id-list sts.amazonaws.com
fi

if aws iam get-role --profile "${PROFILE}" --role-name "${ROLE_NAME}" >/dev/null 2>&1; then
    echo "Role ${ROLE_NAME} already exists, updating trust policy"
    aws iam update-assume-role-policy --profile "${PROFILE}" \
        --role-name "${ROLE_NAME}" \
        --policy-document "${TRUST_POLICY}"
else
    echo "Creating role ${ROLE_NAME}"
    aws iam create-role --profile "${PROFILE}" \
        --role-name "${ROLE_NAME}" \
        --max-session-duration 3600 \
        --assume-role-policy-document "${TRUST_POLICY}" >/dev/null
fi

echo "Attaching PowerUserAccess"
aws iam attach-role-policy --profile "${PROFILE}" \
    --role-name "${ROLE_NAME}" \
    --policy-arn arn:aws:iam::aws:policy/PowerUserAccess

echo "Putting inline policy sst-iam-roles"
aws iam put-role-policy --profile "${PROFILE}" \
    --role-name "${ROLE_NAME}" \
    --policy-name sst-iam-roles \
    --policy-document "${IAM_ROLES_POLICY}"

echo "Done: arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"

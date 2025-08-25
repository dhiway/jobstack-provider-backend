# Getting Started with Jobs API

This guide helps you begin integrating with the platform using our
authentication and job service APIs. All base URLs dynamically use
`window.location.origin`.

---

## 1. Sign In / Sign Up Using Unified OTP

**Postman Folder:** `auth/unified-otp`  
**Reference:** [`/auth/unified-otp`]()

### 1.1 Request OTP

**Endpoint:** ``  **Method:**`POST`

```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phoneNumber": "+919999999999"
}
```

### 1.2 Verify OTP

**Endpoint:** ``  **Method:**`POST`

```json
{
  "email": "john.doe@example.com",
  "phoneNumber": "+919999999999",
  "otp": "123456"
}
```

---

## 2. Create an API Key

**Postman Endpoint:** `/auth/apikey/create`  
**Reference:** [`/auth/apikey`]()

**Endpoint:** ``  **Method:**`POST`

```json
{
  "name": "Default Key",
  "permissions": ["*"]
}
```

Once created, the API key is automatically stored as the default Postman
authentication method. Delete cookies to test this mechanism.

---

## For Providers

### 3. Create an Organisation

**Postman Endpoint:** `/organization/create`  
**Reference:** [`/organization/create`]()

**Endpoint:** ``  **Method:**`POST`

```json
{
  "name": "Acme Corp"
}
```

The resulting organization ID is automatically stored in Postman.

---

### 4. Create a Job Posting

**Postman Endpoint:** `/provider/create-job-posting`  
**Reference:** [`/jobs`]()

**Endpoint:** ``  **Method:**`POST`

```json
{
  "title": "Frontend Engineer",
  "description": "A frontend developer role requiring experience with React.",
  "location": {
    "tag": "hq",
    "address": "123 Street",
    "city": "Bangalore",
    "state": "Karnataka",
    "country": "India",
    "pincode": "560001",
    "gps": { "lat": 12.9716, "lng": 77.5946 }
  },
  "contact": {
    "tag": "recruitment",
    "phoneNumber": ["+919999999999"],
    "email": "hr@acme.com",
    "website": ["https://acme.com"]
  },
  "metadata": {}
}
```

---

## For Seekers

### 5. Create a Profile

**Postman Endpoint:** `/profile/create`  
**Reference:** [`/profile`]()

**Endpoint:** ``  **Method:**`POST`

```json
{
  "type": "personal",
  "contact": {
    "tag": "self",
    "email": "john.doe@example.com",
    "phoneNumber": ["+919999999999"],
    "website": ["https://portfolio.example.com"]
  },
  "location": {
    "tag": "home",
    "address": "456 Lane",
    "city": "Pune",
    "state": "Maharashtra",
    "country": "India",
    "pincode": "411001",
    "gps": { "lat": 18.5204, "lng": 73.8567 }
  },
  "metadata": {}
}
```

You may reuse `tag` or `id` for contact/location if already created.

---

### 6. Apply for Job

**Postman Endpoints:** `/beckn/init`, `/beckn/confirm`

**Reference:** [Beckn APIs]()

- **/beckn/init** (drafts the application)
- **/beckn/confirm** (confirms and submits it)

```json
// Example: /beckn/init
{
  "jobId": "<job-uuid>",
  "profileId": "<seeker-profile-uuid>"
}
```

```json
// Example: /beckn/confirm
{
  "transactionId": "<tx-id>",
  "confirmationDetails": { "note": "Looking forward to joining!" }
}
```

---

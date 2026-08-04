# Cloudinary Setup Guide

Virexo uses Cloudinary for secure, fast media storage. To test Phase 14 locally, you must set up a free Cloudinary account and provide the credentials to the API server.

## 1. Create an Account
1. Go to [Cloudinary](https://cloudinary.com) and sign up for a free account.
2. Verify your email if required.

## 2. Get Your API Keys
1. Once logged in, go to your **Programmable Media Dashboard**.
2. Locate the **Account Details** section.
3. You will need the following three values:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

## 3. Configure Your Environment
1. Open `apps/api/.env`.
2. Add the following variables with your actual keys:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

3. Restart your backend server (`npm run dev` in `apps/api`).

## Note
Cloudinary's free tier is generous and suitable for development and small production apps, offering 25 monthly credits (approx. 25GB of storage or bandwidth).

import React from 'react';
import { Shield } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8 md:p-16">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center space-x-4 mb-8">
          <Shield className="w-10 h-10 text-emerald-500" />
          <h1 className="text-4xl font-bold">Privacy Policy</h1>
        </div>
        <div className="space-y-6 text-neutral-300">
          <p><strong>Last Updated: June 2026</strong></p>
          <p>Welcome to Lake Town Turf. Your privacy is critically important to us. This Privacy Policy explains what information we collect, why we collect it, and how we protect it.</p>
          
          <h2 className="text-2xl font-semibold text-white mt-8 mb-4">1. Information We Collect</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Personal Information:</strong> Name, Email Address, Phone Number, and Flat Number (if you are a society member).</li>
            <li><strong>Authentication Data:</strong> We use Google Authentication and Firebase Auth to securely manage your login sessions.</li>
            <li><strong>Payment Information:</strong> Processed securely via Razorpay. We do not store your credit card or UPI details on our servers.</li>
            <li><strong>Device & Analytics Data:</strong> Anonymous crash reports and usage data (via Firebase Crashlytics and Analytics) to improve the app.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white mt-8 mb-4">2. How We Use Your Data</h2>
          <p>We use the collected information exclusively to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Manage your turf bookings and verify your identity.</li>
            <li>Send push notifications regarding booking status or turf maintenance.</li>
            <li>Ensure payment security and compliance.</li>
            <li>Improve the stability and user experience of our app.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white mt-8 mb-4">3. Third-Party Services</h2>
          <p>We share necessary data with trusted third parties to provide our services:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Google Firebase:</strong> For database hosting, authentication, and push notifications.</li>
            <li><strong>Razorpay:</strong> For secure payment processing.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white mt-8 mb-4">4. Data Deletion & Rights</h2>
          <p>You have the right to access, edit, or delete your personal data. To request data deletion, please contact the society administration or delete your account directly through the app settings.</p>

          <h2 className="text-2xl font-semibold text-white mt-8 mb-4">5. Contact Us</h2>
          <p>If you have any questions regarding this Privacy Policy, please contact the Lake Town Turf administration office.</p>
        </div>
      </div>
    </div>
  );
}

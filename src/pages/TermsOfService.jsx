import React from 'react';
import { FileText } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8 md:p-16">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center space-x-4 mb-8">
          <FileText className="w-10 h-10 text-blue-500" />
          <h1 className="text-4xl font-bold">Terms of Service</h1>
        </div>
        <div className="space-y-6 text-neutral-300">
          <p><strong>Last Updated: June 2026</strong></p>
          <p>By accessing or using the Lake Town Turf app, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the app.</p>
          
          <h2 className="text-2xl font-semibold text-white mt-8 mb-4">1. Turf Booking Rules</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Bookings are subject to availability. Society members receive priority and discounted rates compared to outsiders.</li>
            <li>You must present your booking confirmation (via the app) to the turf manager upon arrival.</li>
            <li>The administration reserves the right to cancel bookings in case of unforeseen maintenance, bad weather, or tournaments. In such cases, full refunds will be issued.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white mt-8 mb-4">2. Payments & Refunds</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>All payments are processed securely via Razorpay.</li>
            <li>If you cancel your booking at least 24 hours in advance, you are eligible for a refund, subject to administrative deductions.</li>
            <li>No refunds are provided for no-shows or cancellations within 24 hours of the slot.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white mt-8 mb-4">3. User Conduct</h2>
          <p>Users must maintain decorum on the turf. The administration holds the right to terminate accounts and ban individuals who:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Damage turf property.</li>
            <li>Engage in abusive behavior.</li>
            <li>Use the app to book slots fraudulently.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-white mt-8 mb-4">4. Liability Disclaimer</h2>
          <p>Lake Town Turf and its administrators are not liable for any personal injury, loss, or damage to belongings that occur on the premises. Use of the turf is at your own risk. Furthermore, we are not liable for any app outages or booking failures caused by third-party services.</p>

          <h2 className="text-2xl font-semibold text-white mt-8 mb-4">5. Amendments</h2>
          <p>We reserve the right to update these Terms of Service at any time. Continued use of the app signifies your acceptance of any changes.</p>
        </div>
      </div>
    </div>
  );
}

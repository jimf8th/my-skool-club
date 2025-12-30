import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-10 text-start">
          <h1 className="mb-4">Privacy Policy</h1>
          <p className="text-muted"><em>Last Updated: December 27, 2025</em></p>

          <section className="mb-4">
            <h2 className="h4 mb-3">1. Introduction</h2>
            <p>
              Welcome to MySkoolClub ("we," "our," or "us"). We are committed to protecting your personal 
              information and your right to privacy. This Privacy Policy explains how we collect, use, 
              disclose, and safeguard your information when you use our platform.
            </p>
          </section>

          <section className="mb-4">
            <h2 className="h4 mb-3">2. Information We Collect</h2>
            <p>We collect information that you provide directly to us, including:</p>
            <ul>
              <li><strong>Account Information:</strong> Name, email address, school affiliation, and password</li>
              <li><strong>Profile Information:</strong> Student ID, grade level, interests, and club memberships</li>
              <li><strong>Usage Information:</strong> How you interact with our platform, including pages visited and features used</li>
              <li><strong>Communication Data:</strong> Messages, announcements, and other communications within the platform</li>
              <li><strong>Payment Information:</strong> When processing club dues or fees (processed securely through third-party providers)</li>
            </ul>
          </section>

          <section className="mb-4">
            <h2 className="h4 mb-3">3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, maintain, and improve our services</li>
              <li>Process your club memberships and manage your account</li>
              <li>Send you updates, announcements, and administrative messages</li>
              <li>Respond to your comments, questions, and requests</li>
              <li>Monitor and analyze trends, usage, and activities</li>
              <li>Detect, prevent, and address technical issues and security threats</li>
              <li>Comply with legal obligations and enforce our terms</li>
            </ul>
          </section>

          <section className="mb-4">
            <h2 className="h4 mb-3">4. Information Sharing and Disclosure</h2>
            <p>We may share your information in the following circumstances:</p>
            <ul>
              <li><strong>With Your School:</strong> School administrators may access information about club activities and student participation</li>
              <li><strong>With Club Leaders:</strong> Club administrators can view member lists and participation data for their clubs</li>
              <li><strong>Service Providers:</strong> Third-party vendors who perform services on our behalf</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, sale, or acquisition</li>
            </ul>
            <p>We do not sell your personal information to third parties.</p>
          </section>

          <section className="mb-4">
            <h2 className="h4 mb-3">5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information 
              against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission 
              over the Internet or electronic storage is 100% secure.
            </p>
          </section>

          <section className="mb-4">
            <h2 className="h4 mb-3">6. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to fulfill the purposes outlined in this 
              Privacy Policy, unless a longer retention period is required or permitted by law.
            </p>
          </section>

          <section className="mb-4">
            <h2 className="h4 mb-3">7. Your Rights and Choices</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access and update your personal information</li>
              <li>Request deletion of your account and associated data</li>
              <li>Opt-out of promotional communications</li>
              <li>Request a copy of your data</li>
              <li>Object to or restrict certain processing of your information</li>
            </ul>
            <p>To exercise these rights, please contact us at privacy@myskoolclub.com.</p>
          </section>

          <section className="mb-4">
            <h2 className="h4 mb-3">8. Children's Privacy</h2>
            <p>
              Our platform is designed for high school students. We comply with applicable laws regarding the 
              collection of information from minors. If you are under 18, please obtain parental or guardian 
              consent before using our services.
            </p>
          </section>

          <section className="mb-4">
            <h2 className="h4 mb-3">9. Cookies and Tracking Technologies</h2>
            <p>
              We use cookies and similar tracking technologies to track activity on our platform and hold certain 
              information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
            </p>
          </section>

          <section className="mb-4">
            <h2 className="h4 mb-3">10. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
              the new Privacy Policy on this page and updating the "Last Updated" date.
            </p>
          </section>

          <section className="mb-4">
            <h2 className="h4 mb-3">11. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us:</p>
            <ul className="list-unstyled">
              <li><i className="fas fa-envelope me-2"></i>Email: privacy@myskoolclub.com</li>
              <li><i className="fas fa-envelope me-2"></i>General Support: support@myskoolclub.com</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

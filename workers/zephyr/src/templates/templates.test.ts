/**
 * Template Rendering Tests
 *
 * Tests the template system that generates HTML and text email content.
 * These templates are Worker-compatible (no React/Node.js rendering).
 */

import { describe, it, expect } from "vitest";
import {
  renderTemplate,
  getTemplateSubject,
  hasTemplate,
  registerTemplate,
} from "./index";
import { porchReplyTemplate } from "./porch-reply";
import { verificationCodeTemplate } from "./verification-code";
import { paymentTemplates } from "./payment";
import { escapeHtml, codeBox, button, link, highlight } from "./base";

// =============================================================================
// Template Registry
// =============================================================================

describe("template registry: hasTemplate", () => {
  it("should return true for registered templates", () => {
    expect(hasTemplate("porch-reply")).toBe(true);
    expect(hasTemplate("verification-code")).toBe(true);
    expect(hasTemplate("payment-received")).toBe(true);
    expect(hasTemplate("payment-failed")).toBe(true);
    expect(hasTemplate("trial-ending")).toBe(true);
    expect(hasTemplate("welcome")).toBe(true);
    expect(hasTemplate("day-1")).toBe(true);
    expect(hasTemplate("raw")).toBe(false); // raw passes through, not a renderer
  });

  it("should return false for unknown templates", () => {
    expect(hasTemplate("unknown-template")).toBe(false);
    expect(hasTemplate("")).toBe(false);
    expect(hasTemplate("PORCH-REPLY")).toBe(false); // case-sensitive
  });
});

describe("template registry: renderTemplate", () => {
  it("should throw for unknown template", async () => {
    await expect(renderTemplate("unknown-template", {})).rejects.toThrow(
      "Unknown template: unknown-template",
    );
  });
});

describe("template registry: registerTemplate", () => {
  it("should allow custom template registration", () => {
    const customRenderer = () => ({
      html: "<p>Custom</p>",
      text: "Custom",
    });

    registerTemplate("test-custom", customRenderer, "Custom Subject");

    expect(hasTemplate("test-custom")).toBe(true);
    expect(getTemplateSubject("test-custom")).toBe("Custom Subject");
  });

  it("should allow function subject for custom templates", () => {
    const customRenderer = () => ({ html: "<p>Test</p>" });
    const subjectFn = (data: Record<string, unknown>) =>
      `Hello ${data.name || "friend"}`;

    registerTemplate("test-dynamic-subject", customRenderer, subjectFn);

    expect(getTemplateSubject("test-dynamic-subject", { name: "Alex" })).toBe(
      "Hello Alex",
    );
    expect(getTemplateSubject("test-dynamic-subject", {})).toBe("Hello friend");
  });
});

// =============================================================================
// Subject Lines
// =============================================================================

describe("template subjects: static subjects", () => {
  it("should return static subject for verification-code", () => {
    expect(getTemplateSubject("verification-code")).toBe(
      "Your Grove verification code",
    );
  });

  it("should return static subject for payment-received", () => {
    expect(getTemplateSubject("payment-received")).toBe(
      "Payment received — thank you! 🌱",
    );
  });

  it("should return static subject for payment-failed", () => {
    expect(getTemplateSubject("payment-failed")).toBe(
      "Payment issue with your Grove subscription",
    );
  });

  it("should return static subject for trial-ending", () => {
    expect(getTemplateSubject("trial-ending")).toBe(
      "Your Grove trial is ending soon",
    );
  });

  it("should return fallback for unknown template", () => {
    expect(getTemplateSubject("unknown")).toBe("(No subject)");
  });
});

describe("template subjects: dynamic subjects", () => {
  it("should generate porch-reply subject with visit number", () => {
    const subject = getTemplateSubject("porch-reply", {
      visitNumber: "P-0001",
      subject: "Question about Grove",
    });
    expect(subject).toBe("Re: Question about Grove [P-0001]");
  });

  it("should generate porch-reply subject without visit number", () => {
    const subject = getTemplateSubject("porch-reply", {
      subject: "Hello there",
    });
    expect(subject).toBe("Re: Hello there");
  });

  it("should use fallback for porch-reply with no subject", () => {
    const subject = getTemplateSubject("porch-reply", {});
    expect(subject).toBe("Re: Your message");
  });

  it("should generate welcome subject based on audience type", () => {
    expect(getTemplateSubject("welcome", { audienceType: "wanderer" })).toBe(
      "Welcome to the Grove 🌿",
    );
    expect(getTemplateSubject("welcome", { audienceType: "promo" })).toBe(
      "You found Grove 🌱",
    );
    expect(getTemplateSubject("welcome", { audienceType: "rooted" })).toBe(
      "Welcome home 🏡",
    );
  });

  it("should generate day-7 subject based on audience type", () => {
    expect(getTemplateSubject("day-7", { audienceType: "promo" })).toBe(
      "Still thinking about it?",
    );
    expect(getTemplateSubject("day-7", { audienceType: "wanderer" })).toBe(
      "What makes Grove different",
    );
  });

  it("should generate trace-notification subject with vote", () => {
    expect(
      getTemplateSubject("trace-notification", {
        vote: "up",
        sourcePath: "/blog/post",
      }),
    ).toBe("[Trace] 👍 /blog/post");

    expect(
      getTemplateSubject("trace-notification", {
        vote: "down",
        sourcePath: "/docs/help",
      }),
    ).toBe("[Trace] 👎 /docs/help");
  });
});

// =============================================================================
// Porch Reply Template
// =============================================================================

describe("porchReplyTemplate", () => {
  it("should render with all data", () => {
    const result = porchReplyTemplate({
      content: "Thanks for reaching out!",
      visitId: "abc123",
      visitNumber: "P-0001",
      subject: "Question",
      visitorName: "Alex",
    });

    expect(result.html).toContain("Hi Alex,");
    expect(result.html).toContain("Thanks for reaching out!");
    expect(result.html).toContain("https://grove.place/porch/visits/abc123");
    expect(result.text).toContain("Hi Alex,");
    expect(result.text).toContain("Thanks for reaching out!");
    expect(result.text).toContain(
      "View this conversation: https://grove.place/porch/visits/abc123",
    );
  });

  it("should use generic greeting without visitor name", () => {
    const result = porchReplyTemplate({
      content: "Hello!",
      visitId: "def456",
    });

    expect(result.html).toContain("Hi there,");
    expect(result.text).toContain("Hi there,");
  });

  it("should preserve line breaks in content", () => {
    const result = porchReplyTemplate({
      content: "Line one\n\nLine two\nLine three",
      visitId: "xyz789",
    });

    expect(result.html).toContain("<br>");
    expect(result.text).toContain("Line one\n\nLine two\nLine three");
  });

  it("should escape HTML in content", () => {
    const result = porchReplyTemplate({
      content: "Hello <script>alert('xss')</script>",
      visitId: "test123",
    });

    expect(result.html).not.toContain("<script>");
    expect(result.html).toContain("&lt;script&gt;");
  });

  it("should include signature", () => {
    const result = porchReplyTemplate({
      content: "Test",
      visitId: "test",
    });

    expect(result.html).toContain("— Autumn");
    expect(result.text).toContain("— Autumn");
  });
});

// =============================================================================
// Verification Code Template
// =============================================================================

describe("verificationCodeTemplate", () => {
  it("should render with code and name", () => {
    const result = verificationCodeTemplate({
      code: "123456",
      name: "Jordan",
    });

    expect(result.html).toContain("Hey Jordan,");
    expect(result.html).toContain("123456");
    expect(result.html).toContain("15 minutes"); // default expiry
    expect(result.text).toContain("Hey Jordan,");
    expect(result.text).toContain("123456");
  });

  it("should use generic greeting without name", () => {
    const result = verificationCodeTemplate({
      code: "654321",
    });

    expect(result.html).toContain("Hey,");
    expect(result.text).toContain("Hey,");
  });

  it("should use custom expiry time", () => {
    const result = verificationCodeTemplate({
      code: "111111",
      expiresIn: "30 minutes",
    });

    expect(result.html).toContain("30 minutes");
    expect(result.text).toContain("30 minutes");
  });

  it("should include preview text with code", () => {
    const result = verificationCodeTemplate({
      code: "999999",
    });

    expect(result.html).toContain("Your Grove verification code: 999999");
  });
});

// =============================================================================
// Payment Templates
// =============================================================================

describe("paymentTemplates.received", () => {
  it("should render thank you email", () => {
    const result = paymentTemplates.received({
      name: "Sam",
      planName: "Grove Monthly",
      amount: "$5.00",
      date: "Jan 15, 2026",
    });

    expect(result.html).toContain("Hey Sam,");
    expect(result.html).toContain("Grove Monthly");
    expect(result.html).toContain("$5.00");
    expect(result.html).toContain("Jan 15, 2026");
    expect(result.text).toContain("Hey Sam,");
    expect(result.text).toContain("Amount: $5.00");
  });

  it("should use defaults for missing data", () => {
    const result = paymentTemplates.received({});

    expect(result.html).toContain("Hey,");
    expect(result.html).toContain("your Grove subscription");
    expect(result.html).toContain("https://plant.grove.place/account");
  });
});

describe("paymentTemplates.failed", () => {
  it("should render payment failed email", () => {
    const result = paymentTemplates.failed({
      name: "Taylor",
      amount: "$5.00",
    });

    expect(result.html).toContain("Hey Taylor,");
    expect(result.html).toContain("trouble processing your payment");
    expect(result.html).toContain("$5.00");
    expect(result.html).toContain("Update payment method");
    expect(result.text).toContain("trouble processing your payment");
  });

  it("should not mention amount if not provided", () => {
    const result = paymentTemplates.failed({
      name: "Riley",
    });

    expect(result.html).not.toContain("of $");
    expect(result.text).not.toContain("of $");
  });
});

describe("paymentTemplates.trialEnding", () => {
  it("should render trial ending email with days", () => {
    const result = paymentTemplates.trialEnding({
      name: "Casey",
      daysRemaining: 3,
      planName: "Grove Pro",
    });

    expect(result.html).toContain("Hey Casey,");
    expect(result.html).toContain("Grove Pro trial ends in 3 days");
    expect(result.text).toContain("3 days");
  });

  it("should use singular 'day' for 1 day remaining", () => {
    const result = paymentTemplates.trialEnding({
      daysRemaining: 1,
    });

    expect(result.html).toContain("1 day");
    expect(result.text).toContain("1 day");
    expect(result.html).not.toContain("1 days");
  });
});

// =============================================================================
// Base Template Helpers
// =============================================================================

describe("escapeHtml", () => {
  it("should escape all special characters", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
    expect(escapeHtml('"quotes"')).toBe("&quot;quotes&quot;");
    expect(escapeHtml("'apostrophe'")).toBe("&#039;apostrophe&#039;");
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("should handle safe text unchanged", () => {
    expect(escapeHtml("Hello World")).toBe("Hello World");
    expect(escapeHtml("test@example.com")).toBe("test@example.com");
  });
});

describe("codeBox", () => {
  it("should render code display with styling", () => {
    const html = codeBox("123456");

    expect(html).toContain("123456");
    expect(html).toContain("letter-spacing: 8px");
    expect(html).toContain("font-size: 32px");
  });

  it("should escape HTML in code", () => {
    const html = codeBox("<script>alert(1)</script>");

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("button", () => {
  it("should render button with link", () => {
    const html = button("Click Me", "https://example.com");

    expect(html).toContain('href="https://example.com"');
    expect(html).toContain("Click Me");
    expect(html).toContain("border-radius");
  });

  it("should escape special characters in href", () => {
    const html = button("Test", "https://example.com?a=1&b=2");

    expect(html).toContain("?a=1&amp;b=2");
  });
});

describe("link", () => {
  it("should render styled link", () => {
    const html = link("Visit Grove", "https://grove.place");

    expect(html).toContain('href="https://grove.place"');
    expect(html).toContain("Visit Grove");
  });
});

describe("highlight", () => {
  it("should wrap content in highlight box", () => {
    const html = highlight("<p>Important info</p>");

    expect(html).toContain("Important info");
    expect(html).toContain("background-color: rgba(22, 163, 74, 0.1)");
    expect(html).toContain("border-radius");
  });
});

<script lang="ts">
  export let data;
  const { legalDocs } = data;
</script>

<svelte:head>
  <title>Legal & Policies - Grove Knowledge Base</title>
  <meta name="description" content="Legal documents, terms of service, privacy policy, and other policies for Grove platform" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-purple-50 to-white">
  <div class="max-w-6xl mx-auto px-4 py-12">
    <!-- Breadcrumb -->
    <nav class="flex items-center space-x-2 text-sm text-gray-600 mb-8">
      <a href="/knowledge" class="hover:text-purple-600">Knowledge Base</a>
      <span>/</span>
      <span class="text-gray-900">Legal & Policies</span>
    </nav>

    <!-- Header -->
    <div class="mb-12">
      <h1 class="text-4xl font-bold text-gray-900 mb-4">Legal & Policies</h1>
      <p class="text-xl text-gray-600 max-w-3xl">
        Our terms of service, privacy policy, and other legal documents.
        We believe in transparency and keeping these documents readable and straightforward.
      </p>
    </div>

    <!-- Legal Docs List -->
    <div class="grid gap-6">
      {#each legalDocs as doc}
        <article class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <h2 class="text-xl font-semibold text-gray-900 mb-2">
                <a href="/knowledge/legal/{doc.slug}" class="hover:text-purple-600">
                  {doc.title}
                </a>
              </h2>
              {#if doc.description}
                <p class="text-gray-600 mb-3">{doc.description}</p>
              {/if}
              <p class="text-gray-500 text-sm">{doc.excerpt}</p>
            </div>
            <div class="ml-6 text-right">
              <div class="text-sm text-gray-500 mb-1">{doc.readingTime} min read</div>
              {#if doc.lastUpdated}
                <div class="text-xs text-gray-400">Updated {doc.lastUpdated}</div>
              {/if}
            </div>
          </div>
          <div class="flex items-center justify-between">
            <a
              href="/knowledge/legal/{doc.slug}"
              class="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium"
            >
              Read document
              <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Legal Document
            </span>
          </div>
        </article>
      {/each}
    </div>

    <!-- Contact CTA -->
    <div class="mt-12 bg-purple-50 rounded-lg p-8 text-center">
      <h3 class="text-xl font-semibold text-gray-900 mb-2">Questions about our policies?</h3>
      <p class="text-gray-600 mb-4">
        If you have questions about our terms or policies, or need clarification on anything, please reach out.
      </p>
      <a href="mailto:autumn@grove.place" class="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
        Contact Us
        <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </a>
    </div>
  </div>
</div>

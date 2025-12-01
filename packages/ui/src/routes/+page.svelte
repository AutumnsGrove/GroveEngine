<script lang="ts">
  import {
    Button,
    Input,
    Textarea,
    Card,
    Badge,
    Tag,
    Alert,
    Avatar,
    Divider,
    Modal,
    Tooltip,
    Spinner,
    Progress,
    Icon,
  } from '$lib';

  let modalOpen = $state(false);
  let progressValue = $state(65);
  let inputValue = $state('');
</script>

<div class="max-w-4xl mx-auto px-6 py-12 space-y-16">
  <!-- Header -->
  <header class="text-center space-y-4">
    <div class="flex justify-center mb-6">
      <svg viewBox="0 0 48 48" class="w-16 h-16" fill="none">
        <path d="M24 4c-6 9-18 14-18 24 0 8 8 16 18 16s18-8 18-16c0-10-12-15-18-24z" fill="#15803d" opacity="0.3"/>
        <path d="M24 8c-5 7.5-14 11.5-14 19 0 6.5 6 12.5 14 12.5s14-6 14-12.5c0-7.5-9-11.5-14-19z" fill="#16a34a" opacity="0.6"/>
        <path d="M24 12c-4 6-10 9-10 15 0 5 4 9 10 9s10-4 10-9c0-6-6-9-10-15z" fill="#22c55e"/>
        <path d="M24 30v10" stroke="#15803d" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
    <h1 class="font-serif text-display">Grove Design System</h1>
    <p class="text-bark-600 text-body-lg italic font-serif">"a place to Be"</p>
  </header>

  <Divider leaf />

  <!-- Buttons -->
  <section class="space-y-6">
    <h2 class="font-serif text-heading-lg">Buttons</h2>
    <div class="flex flex-wrap gap-4">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="outline">Outline</Button>
    </div>
    <div class="flex flex-wrap gap-4">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
    <div class="flex flex-wrap gap-4">
      <Button loading>Loading</Button>
      <Button disabled>Disabled</Button>
    </div>
  </section>

  <Divider />

  <!-- Form Elements -->
  <section class="space-y-6">
    <h2 class="font-serif text-heading-lg">Form Elements</h2>
    <div class="grid gap-6 max-w-md">
      <Input
        label="Email"
        type="email"
        placeholder="your@email.com"
        helpText="We'll never share your email."
        bind:value={inputValue}
      />
      <Input
        label="With Error"
        error
        errorMessage="This field is required"
        value="Invalid input"
      />
      <Textarea
        label="Bio"
        placeholder="Tell us about yourself..."
        helpText="A few sentences about who you are."
      />
    </div>
  </section>

  <Divider />

  <!-- Cards -->
  <section class="space-y-6">
    <h2 class="font-serif text-heading-lg">Cards</h2>
    <div class="grid md:grid-cols-2 gap-6">
      <Card>
        {#snippet header()}
          <h3 class="font-serif text-heading">Default Card</h3>
        {/snippet}
        <p class="text-bark-700">A quiet space for your content. Cards provide structure without overwhelming.</p>
        {#snippet footer()}
          <Button size="sm" variant="ghost">Learn more</Button>
        {/snippet}
      </Card>

      <Card variant="elevated" hoverable>
        {#snippet header()}
          <h3 class="font-serif text-heading">Hoverable Card</h3>
        {/snippet}
        <p class="text-bark-700">This card lifts slightly on hover, inviting interaction.</p>
      </Card>
    </div>
  </section>

  <Divider />

  <!-- Badges & Tags -->
  <section class="space-y-6">
    <h2 class="font-serif text-heading-lg">Badges & Tags</h2>
    <div class="flex flex-wrap gap-3">
      <Badge>Default</Badge>
      <Badge variant="primary">Primary</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="error">Error</Badge>
      <Badge variant="info">Info</Badge>
    </div>
    <div class="flex flex-wrap gap-3">
      <Badge variant="success" dot>With Dot</Badge>
    </div>
    <div class="flex flex-wrap gap-3">
      <Tag>Simple Tag</Tag>
      <Tag variant="primary">Primary</Tag>
      <Tag removable onremove={() => alert('Removed!')}>Removable</Tag>
    </div>
  </section>

  <Divider />

  <!-- Alerts -->
  <section class="space-y-6">
    <h2 class="font-serif text-heading-lg">Alerts</h2>
    <div class="space-y-4">
      <Alert variant="sprout" title="Success!">
        Your post has been published and is now live in your grove.
      </Alert>
      <Alert variant="sunlight" title="Heads up">
        Your draft will be auto-saved, but remember to publish when ready.
      </Alert>
      <Alert variant="frost" title="Something went wrong">
        We couldn't save your changes. Please try again.
      </Alert>
      <Alert variant="rain">
        <strong>Did you know?</strong> You can use markdown in your posts.
      </Alert>
    </div>
  </section>

  <Divider />

  <!-- Avatar -->
  <section class="space-y-6">
    <h2 class="font-serif text-heading-lg">Avatars</h2>
    <div class="flex flex-wrap items-end gap-4">
      <Avatar size="xs" name="Jane Doe" />
      <Avatar size="sm" name="Jane Doe" />
      <Avatar size="md" name="Jane Doe" />
      <Avatar size="lg" name="Jane Doe" />
      <Avatar size="xl" name="Jane Doe" />
      <Avatar size="2xl" name="Jane Doe" />
    </div>
    <div class="flex flex-wrap gap-4">
      <Avatar name="John Smith" status="online" />
      <Avatar name="Jane Doe" status="away" />
      <Avatar name="Bob Wilson" status="busy" />
      <Avatar initials="GR" status="offline" />
    </div>
  </section>

  <Divider />

  <!-- Modal -->
  <section class="space-y-6">
    <h2 class="font-serif text-heading-lg">Modal</h2>
    <Button onclick={() => modalOpen = true}>Open Modal</Button>

    <Modal
      bind:open={modalOpen}
      title="Welcome to Grove"
      description="A quiet corner of the internet"
      onclose={() => modalOpen = false}
    >
      <p class="text-bark-700">
        Grove is a place for writers who want to escape the noise. Here, your words matter more than metrics.
      </p>
      {#snippet footer()}
        <Button variant="ghost" onclick={() => modalOpen = false}>Cancel</Button>
        <Button onclick={() => modalOpen = false}>Get Started</Button>
      {/snippet}
    </Modal>
  </section>

  <Divider />

  <!-- Tooltip -->
  <section class="space-y-6">
    <h2 class="font-serif text-heading-lg">Tooltips</h2>
    <div class="flex flex-wrap gap-4">
      <Tooltip content="Hello from above!" position="top">
        <Button variant="secondary">Top</Button>
      </Tooltip>
      <Tooltip content="Hello from below!" position="bottom">
        <Button variant="secondary">Bottom</Button>
      </Tooltip>
      <Tooltip content="Hello from the left!" position="left">
        <Button variant="secondary">Left</Button>
      </Tooltip>
      <Tooltip content="Hello from the right!" position="right">
        <Button variant="secondary">Right</Button>
      </Tooltip>
    </div>
  </section>

  <Divider />

  <!-- Loading States -->
  <section class="space-y-6">
    <h2 class="font-serif text-heading-lg">Loading States</h2>
    <div class="flex flex-wrap items-center gap-6">
      <div class="text-center">
        <Spinner variant="circle" />
        <p class="text-xs text-bark-600 mt-2">Circle</p>
      </div>
      <div class="text-center">
        <Spinner variant="leaf" />
        <p class="text-xs text-bark-600 mt-2">Leaf</p>
      </div>
      <div class="text-center">
        <Spinner variant="dots" />
        <p class="text-xs text-bark-600 mt-2">Dots</p>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-4">
      <Spinner size="sm" />
      <Spinner size="md" />
      <Spinner size="lg" />
      <Spinner size="xl" />
    </div>
  </section>

  <Divider />

  <!-- Progress -->
  <section class="space-y-6">
    <h2 class="font-serif text-heading-lg">Progress</h2>
    <div class="space-y-4 max-w-md">
      <Progress value={progressValue} showLabel label="Upload progress" />
      <Progress value={30} size="sm" />
      <Progress value={60} size="lg" />
      <Progress indeterminate label="Loading..." />
    </div>
    <div class="flex gap-2">
      <Button size="sm" variant="ghost" onclick={() => progressValue = Math.max(0, progressValue - 10)}>-10%</Button>
      <Button size="sm" variant="ghost" onclick={() => progressValue = Math.min(100, progressValue + 10)}>+10%</Button>
    </div>
  </section>

  <Divider />

  <!-- Icons -->
  <section class="space-y-6">
    <h2 class="font-serif text-heading-lg">Icons</h2>
    <div class="flex flex-wrap gap-4 text-bark-700">
      <Icon name="leaf" size="lg" />
      <Icon name="seedling" size="lg" />
      <Icon name="tree" size="lg" />
      <Icon name="sun" size="lg" />
      <Icon name="moon" size="lg" />
      <Icon name="search" size="lg" />
      <Icon name="edit" size="lg" />
      <Icon name="heart" size="lg" />
      <Icon name="bookmark" size="lg" />
      <Icon name="share" size="lg" />
      <Icon name="mail" size="lg" />
      <Icon name="user" size="lg" />
    </div>
  </section>

  <Divider leaf />

  <!-- Footer -->
  <footer class="text-center py-8">
    <p class="text-bark-500 text-sm">
      Grove Design System &middot; Made with care
    </p>
  </footer>
</div>

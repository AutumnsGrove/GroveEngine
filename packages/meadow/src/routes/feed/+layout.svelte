<!--
  Feed Layout — Header with auth nav + Footer
-->
<script lang="ts">
  import { Header, Footer, type NavItem } from '@autumnsgrove/groveengine/ui/chrome';
  import { buildLoginUrl } from '@autumnsgrove/groveengine/grafts/login';
  import { Trees, Bookmark } from 'lucide-svelte';

  let { children, data } = $props();

  const loggedIn = $derived(!!data?.user);

  const navItems: NavItem[] = $derived.by(() => {
    const items: NavItem[] = [
      { href: 'https://grove.place', label: 'Grove', icon: Trees, external: true },
    ];
    if (loggedIn) {
      items.push({ href: '/bookmarks', label: 'Bookmarks', icon: Bookmark });
    }
    return items;
  });

  const headerUser = $derived(
    data?.user
      ? { id: data.user.id, name: data.user.name, email: data.user.email }
      : null,
  );
</script>

<Header
  {navItems}
  brandTitle="Meadow"
  showSignIn={true}
  signInHref={buildLoginUrl('/feed')}
  user={headerUser}
/>

{@render children()}

<Footer />

<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import { AppBar, Avatar, LightSwitch, menu } from '@skeletonlabs/skeleton'
  import { _ } from 'svelte-i18n'
  import { NAVBAR_HEIGHT, NAV_SIDEBAR_WIDTH } from '../constants'

  const currentUser = $page.data.user

  function handleLogout() {
    $page.data.pb?.authStore.clear()
    goto('/logout', { invalidateAll: true })
  }
</script>

<AppBar background={`bg-white/80 dark:bg-black/30 ${NAVBAR_HEIGHT}`} padding="pr-2 justify-center">
  <svelte:fragment slot="lead">
    {#if currentUser}
      <div class={`flex ${NAV_SIDEBAR_WIDTH} justify-center`}>
        <img class="h-8" src="/logo.png" alt={$_('branding.sitename')} />
      </div>
    {:else}
      <a href="/" class="flex items-center gap-2">
        <img class="h-8" src="/logo.png" alt={$_('branding.sitename')} />
        <span class="font-brand text-3xl text-primary-500">
          {$_('branding.sitename')}
        </span>
      </a>
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="trail">
    {#if currentUser}
      <!-- Use a wrapping .relative class to confine the menu position -->
      <span class="relative">
        <!-- Trigger: apply the 'use:menu' action and supply the unique menu ID -->
        <button use:menu={{ menu: 'user' }} class="btn-neutral group btn !space-x-0 !py-1.5">
          <Avatar
            src={`https://avatars.dicebear.com/api/bottts/${currentUser.email || 'unknown'}.svg`}
            width="w-5"
            border="border border-surface-500"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 320 512"
            class="w-2.5 fill-black opacity-50 transition ease-in-out group-hover:-translate-y-[2px] dark:fill-white"
          >
            <path
              d="M137.4 374.6c12.5 12.5 32.8 12.5 45.3 0l128-128c9.2-9.2 11.9-22.9 6.9-34.9s-16.6-19.8-29.6-19.8L32 192c-12.9 0-24.6 7.8-29.6 19.8s-2.2 25.7 6.9 34.9l128 128z"
            />
          </svg>
        </button>

        <nav class="card list-nav p-1 shadow-lg" data-menu="user">
          <ul class="flex flex-col items-center pt-2">
            <li>
              <LightSwitch />
            </li>
            <li>
              <button class="w-full p-1" on:click={handleLogout}>{$_('nav.logOut')}</button>
            </li>
          </ul>
        </nav>
      </span>
    {:else}
      <LightSwitch />

      <div class="flex items-center gap-4">
        <a href="/register" class="btn variant-filled-primary" type="button">
          {$_('buttons.createAccount')}
        </a>
        <a href="/login" class="btn variant-ringed-primary" type="button">
          {$_('buttons.loginAccount')}
        </a>
      </div>
    {/if}
  </svelte:fragment>
</AppBar>

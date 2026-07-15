<script lang="ts">
	let { data } = $props();
</script>

<main>
	{#if data.user}
		<div class="user-info">
			{#if data.user.picture}
				<img src={data.user.picture} alt="" class="avatar" />
			{/if}
			<span>{data.user.name}</span>
			<a href="/logout" class="btn-logout">Log out</a>
		</div>
	{:else}
		<h1>Sign in</h1>
		<a class="google" href="/auth/google">Continue with Google</a>
	{/if}
</main>

<style>
	main {
		max-width: 380px;
		margin: 5rem auto;
		padding: 0 1.25rem;
		text-align: center;
	}
	h1 {
		color: #16233f;
		margin-bottom: 1.5rem;
	}
	.google {
		display: block;
		padding: 0.8rem;
		border: 1px solid #dbe3f0;
		border-radius: 9px;
		text-decoration: none;
		color: #16233f;
		font-weight: 600;
		background: #fff;
	}
	.user-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		justify-content: center;
	}
	.avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
	}
	.btn-logout {
		padding: 0.4rem 0.8rem;
		border: 1px solid #dbe3f0;
		border-radius: 6px;
		text-decoration: none;
		color: #16233f;
		font-size: 0.85rem;
	}
</style>

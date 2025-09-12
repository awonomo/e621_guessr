<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  // ratings mapping
  const ratingMap = {
    safe: 'rating:s',
    questionable: 'rating:q',
    explicit: 'rating:e'
  };

  // form state
  let timeLimit = 120;
  let gameMode = 'tagGuessing';
  let ratings = { safe: true, questionable: false, explicit: false };
  let minUpvotes = 250;
  let customCriteria = '';

  // helper: toggle checkbox
  function toggle(r) {
    ratings = { ...ratings, [r]: !ratings[r] };
  }

  // build the tags string for API
  function buildTags() {
    const tags = [];

    // ---- Ratings ----
    const selected = Object.keys(ratings).filter(k => ratings[k]);

    if (selected.length === 1) {
      // only one rating selected → just include that one
      tags.push(ratingMap[selected[0]]);
    } else if (selected.length === 2) {
      // two selected → exclude the missing one
      const missing = Object.keys(ratings).find(k => !ratings[k]);
      tags.push('-' + ratingMap[missing]);
    }
    // if all three are selected, do nothing (default)

    // ---- Score ----
    if (minUpvotes > 0) {
      tags.push(`score:>=${minUpvotes}`);
    }

    // ---- Fixed tags ----
    tags.push('-animated', '-young', 'tagcount:>=50');

    // ---- Custom criteria ----
    if (customCriteria.trim()) {
      tags.push(customCriteria.trim());
    }

    return tags.join(' ');
  }

  async function submit(e) {
    e.preventDefault();

    const tags = buildTags();
    console.log('Final tags for API:', tags);

    const res = await fetch(`/pull-posts?tags=${encodeURIComponent(tags)}`);
    const data = await res.json();

    // frontend game config (timeLimit & gameMode stay local)
    const config = {
      timeLimit,
      gameMode,
      ratings: Object.keys(ratings).filter(k => ratings[k]),
      minUpvotes,
      customCriteria,
      post: data
    };

    dispatch('start', config);
  }
</script>

<form on:submit|preventDefault={submit} class="setup-form">
  <div>
    <label>Time Limit (seconds)</label>
    <input type="number" min="30" bind:value={timeLimit} />
  </div>

  <div>
    <label>Game Mode</label>
    <select bind:value={gameMode}>
      <option value="tagGuessing">Tag Guessing</option>
    </select>
  </div>

  <div>
    <label>Rating</label>
    <div>
      {#each Object.keys(ratings) as r}
        <label>
          <input type="checkbox" checked={ratings[r]} on:change={() => toggle(r)} />
          {r}
        </label>
      {/each}
    </div>
  </div>

  <div>
    <label>Minimum Upvotes</label>
    <input type="number" min="0" bind:value={minUpvotes} />
  </div>

  <div>
    <label>Custom Criteria</label>
    <input type="text" bind:value={customCriteria} placeholder="e.g. special tag" />
  </div>

  <button type="submit">Start Game</button>
</form>

<style>
  .setup-form { max-width: 700px; margin: 2rem auto; }
  label { display:block; margin-bottom: .25rem; }
  input, select { padding:.5rem; width:100%; margin-bottom: .75rem; }
</style>
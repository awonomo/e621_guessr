<script>
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  // ratings mapping
  const ratingMap = {
    safe: "rating:s",
    questionable: "rating:q",
    explicit: "rating:e",
  };

  // form state
  let timeLimit = 120;

  $: if (timeLimit < 30) {
    timeLimit = 30;
  }
  let gameMode = "tagGuessing";
  let ratings = { safe: true, questionable: false, explicit: false };
  let minUpvotes = 250;
    $: if (minUpvotes > 10000) {
    minUpvotes = 10000;
  }
  let customCriteria = "";

  // helper: toggle checkbox
  function toggle(r) {
    ratings = { ...ratings, [r]: !ratings[r] };
  }

  // build the tags string for API
  function buildTags() {
    const tags = [];

    // ---- Ratings ----
    const selected = Object.keys(ratings).filter((k) => ratings[k]);

    if (selected.length === 1) {
      // only one rating selected → just include that one
      tags.push(ratingMap[selected[0]]);
    } else if (selected.length === 2) {
      // two selected → exclude the missing one
      const missing = Object.keys(ratings).find((k) => !ratings[k]);
      tags.push("-" + ratingMap[missing]);
    }
    // if all three are selected, do nothing (default)

    // ---- Score ----
    if (minUpvotes > 0) {
      tags.push(`score:>=${minUpvotes}`);
    }

    // ---- Fixed tags ----
    tags.push("-animated", "-young", "tagcount:>=50");

    // ---- Custom criteria ----
    if (customCriteria.trim()) {
      tags.push(customCriteria.trim());
    }

    return tags.join(" ");
  }

  async function submit(e) {
    e.preventDefault();

    const tags = buildTags();
    console.log("Final tags for API:", tags);

    const res = await fetch(`/pull-posts?tags=${encodeURIComponent(tags)}`);
    const data = await res.json();

    // frontend game config (timeLimit & gameMode stay local)
    const config = {
      timeLimit,
      gameMode,
      ratings: Object.keys(ratings).filter((k) => ratings[k]),
      minUpvotes,
      customCriteria,
      post: data,
    };

    dispatch("start", config);
  }
</script>

<main>
  <img id="mascot" src="https://static1.e621.net/data/e3/7a/e37aa3f786602f4dc8020f93675376f2.gif" alt="Post 2939458">
  <div class="mascot-credit">artist: tuwka</div>
  <header class="logo-header">
    <h1>e6_tag_challenge</h1>
    <span>by awonomo and birch</span>
  </header>
<form on:submit|preventDefault={submit} class="setup-form">
  <div>
    <label for="timeLimit">Time Limit (seconds)</label>
    <input id="timeLimit" type="number" min="30" bind:value={timeLimit} />
  </div>

  <div>
    <label for="gameMode">Game Mode</label>
    <select id="gameMode" bind:value={gameMode}>
      <option value="tagGuessing">Tag Guessing</option>
    </select>
  </div>

  <div>
    <fieldset>
      <legend>Rating</legend>
      <div>
        {#each Object.keys(ratings) as r}
          <label for={`rating-${r}`}>
            <input
              id={`rating-${r}`}
              type="checkbox"
              checked={ratings[r]}
              on:change={() => toggle(r)}
            />
            {r}
          </label>
        {/each}
      </div>
    </fieldset>
  </div>

  <div>
    <label for="minUpvotes">Minimum Upvotes</label>
    <input id="minUpvotes" type="number" min="0" bind:value={minUpvotes} />
  </div>

  <div>
    <label for="customCriteria">Custom Criteria</label>
    <input
      id="customCriteria"
      type="text"
      bind:value={customCriteria}
      placeholder="filter by tags"
      maxlength="32"
    />
  </div>

  <button id="start-button" type="submit">Start Game</button>
</form>
</main>

<style>
    main {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .setup-form {
    max-width: 700px;
    margin: 2rem auto;
  }
  label {
    display: block;
    margin-bottom: 0.25rem;
  }
  input,
  select {
    padding: 0.5rem;
    width: 100%;
    margin-bottom: 0.75rem;
  }

  .logo-header {
    text-align: center;
  }

  #mascot {
    display: block;
    margin: 0 auto 0.5rem auto;
    width: 40vh;
    border-radius: 8px;
  }
  .mascot-credit {
    text-align: center;
    font-size: 0.95rem;
    color: #aaa;
    margin-bottom: 1rem;
  }

  #start-button {
    border-radius: 8px;
    border: none;
    background: #fcb342;
    font-weight: 600;
    width: 100%;
    font-weight: 600;
    font-size: 1.1rem;
  }

</style>

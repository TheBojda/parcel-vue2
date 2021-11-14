<template>
  <b-card class="mt-3" header="Form Data Result">
    <pre class="m-0">{{ value }}</pre>
  </b-card>
</template>

<script>
import Vue from "vue";

export default Vue.extend({
  name: "AppResult",
  props: {
    value: String,
  },
});
</script>

<template>
  <p>{{ greeting }} World!</p>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";

// @Component
class App extends Vue {
  public greeting: string = "Hello";
}

export default Component(App);
</script>

<style scoped>
p {
  font-size: 2em;
  text-align: center;
}
</style>
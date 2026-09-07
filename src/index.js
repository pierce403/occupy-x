export default {
  fetch() {
    return new Response("Hello world from occupy-x!\n", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
};

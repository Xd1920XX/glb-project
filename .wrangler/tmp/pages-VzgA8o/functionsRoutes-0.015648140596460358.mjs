import { onRequestPost as __api_submit_js_onRequestPost } from "/Users/karlstensuu/glb-project/functions/api/submit.js"
import { onRequest as __api_submit_js_onRequest } from "/Users/karlstensuu/glb-project/functions/api/submit.js"

export const routes = [
    {
      routePath: "/api/submit",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_submit_js_onRequestPost],
    },
  {
      routePath: "/api/submit",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_submit_js_onRequest],
    },
  ]
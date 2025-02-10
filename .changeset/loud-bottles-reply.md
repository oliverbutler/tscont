---
'@ts-rest/nest': minor
---

Change multi-handler to not use @All decorator, now creates dummy methods for each route within a multi handler at runtime. This means we no longer need our own route matching alogirithm (we can utilise nest entirely) and we now don't have collisions with other controllers with the same path but different methods

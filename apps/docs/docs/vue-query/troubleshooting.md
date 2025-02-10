# Troubleshooting

## `Client not initialized.`

If you see this error despite having installed the `TsRestPlugin` in your Vue app, you might be trying to use `useQuery()`
outside of a component's `setup()` phase.

See the official [Vue docs](https://vuejs.org/api/composition-api-dependency-injection.html#inject) for more info.

## `QueryClient not initialized.`

Same as above; `useQueryClient()` must be called within a component's `setup()` phase.

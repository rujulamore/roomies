export default function Home() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Welcome to RoomieBoard</h1>
      <p>Create a profile, browse people by city/budget/tags, and connect.</p>
      <div className="flex gap-3">
        <a className="px-4 py-2 rounded bg-black text-white" href="/signin">Sign in</a>
        <a className="px-4 py-2 rounded border" href="/browse">Browse</a>
      </div>
    </div>
  )
}

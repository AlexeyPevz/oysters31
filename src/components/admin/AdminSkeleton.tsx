export function AdminSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 w-32 bg-gray-800 rounded" />
        <div className="h-10 w-64 bg-gray-800 rounded" />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
            <div className="h-4 w-24 bg-gray-800 rounded mb-4" />
            <div className="h-8 w-32 bg-gray-800 rounded" />
          </div>
        ))}
      </div>
      
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-12 w-12 bg-gray-800 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-gray-800 rounded" />
                <div className="h-3 w-32 bg-gray-800 rounded" />
              </div>
              <div className="h-8 w-24 bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}



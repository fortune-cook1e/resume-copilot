'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { disconnectMcp, getMcpConnection } from '@/services/mcp-connection'

const scopeLabels = {
  'resumes:read': 'Read resume titles and selected content',
  'resumes:read_full': 'Read full resumes, including contact details',
  'resumes:write': 'Create private resumes and edit selected resume text',
  'resumes:edit': 'Edit resume content and design',
  'resumes:manage': 'Manage resume details, copy resumes, and permanently delete resumes',
  offline_access: 'Renew access when you are away',
}

export default function ChatGptConnection({ userId }: { userId: string }) {
  const queryClient = useQueryClient()
  const queryKey = ['mcp-connection', userId]
  const connection = useQuery({
    queryKey,
    queryFn: ({ signal }) => getMcpConnection(signal),
  })
  const disconnect = useMutation({
    mutationFn: disconnectMcp,
    onSuccess: async () => {
      await queryClient.cancelQueries({ queryKey })
      queryClient.setQueryData(queryKey, null)
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Connected apps</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {connection.isPending ? (
          <Skeleton className="h-5 w-40" aria-label="Loading connected apps" />
        ) : connection.isError ? (
          <p role="alert" className="text-sm text-destructive">
            Could not load connected apps.
          </p>
        ) : connection.data ? (
          <div className="space-y-3">
            <h3 className="font-medium">{connection.data.clientName}</h3>
            <ul className="list-inside list-disc text-sm text-muted-foreground">
              {connection.data.scopes.map((scope) => (
                <li key={scope}>{scopeLabels[scope]}</li>
              ))}
            </ul>
            <AlertDialog
              onOpenChange={(open) => {
                if (open) disconnect.reset()
              }}
            >
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={disconnect.isPending}>
                  Disconnect ChatGPT
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect ChatGPT?</AlertDialogTitle>
                  <AlertDialogDescription>
                    ChatGPT will need your permission again to access your resumes.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {disconnect.isError && (
                  <p role="alert" className="text-sm text-destructive">
                    Could not disconnect ChatGPT. Try again.
                  </p>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={disconnect.isPending}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={disconnect.isPending}
                    onClick={(event) => {
                      event.preventDefault()
                      disconnect.mutate()
                    }}
                  >
                    {disconnect.isPending ? 'Disconnecting…' : 'Disconnect'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          <p role="status" className="text-sm text-muted-foreground">
            No active ChatGPT connection.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

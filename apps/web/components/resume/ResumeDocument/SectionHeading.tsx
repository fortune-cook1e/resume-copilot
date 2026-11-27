import { useDocumentData } from './data'

export default function SectionHeading({ children }: { children: string }) {
  const template = useDocumentData().resume?.design?.template
  return (
    <div className="resume-section-heading">
      <h2 data-resume-heading className="font-semibold">
        {template === 'meowth' || template === 'scizor' ? children.toUpperCase() : children}
      </h2>
    </div>
  )
}

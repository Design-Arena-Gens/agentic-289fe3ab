import { ElectroFireStudio } from './components/ElectroFireStudio';

export default function Page() {
  return (
    <main
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start'
      }}
    >
      <ElectroFireStudio />
    </main>
  );
}

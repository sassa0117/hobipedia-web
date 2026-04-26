export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-3xl text-center">
        <p className="text-sm font-medium text-zinc-500">準備中</p>
        <h1 className="mt-4 text-5xl font-bold tracking-tight text-zinc-900 sm:text-6xl">
          Hobipedia
        </h1>
        <p className="mt-6 text-lg leading-8 text-zinc-600">
          アニメ・特撮・キャラクターグッズの網羅的な相場・コレクションウィキ
        </p>
        <p className="mt-12 text-sm text-zinc-500">
          実取引データから算出した中央値・推移グラフ・出品情報を1画面で。
          <br />
          Coming soon.
        </p>
      </div>
    </main>
  );
}

} catch (error) {
  return Response.json(
    {
      success: false,
      error: error.message || String(error),
    },
    { status: 500 }
  );
}

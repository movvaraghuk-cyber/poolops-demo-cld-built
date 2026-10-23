const supabase = require("./_supabase");

// Runs daily from Vercel Cron (see vercel.json). Deletes job photos once an invoice's
// photos_expire_at has passed (30 days after it was paid). Unpaid invoices keep their photos.
// Needs CRON_SECRET and SUPABASE_SERVICE_ROLE_KEY set in Vercel.

const BUCKET = "job-photos";
const MARKER = "/storage/v1/object/public/" + BUCKET + "/";

function storagePath(url) {
  var at = String(url).indexOf(MARKER);
  return at === -1 ? null : decodeURIComponent(String(url).slice(at + MARKER.length));
}

module.exports = async (req, res) => {
  if (!process.env.CRON_SECRET || req.headers.authorization !== "Bearer " + process.env.CRON_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!supabase.hasServiceRole) {
    res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY is not set" });
    return;
  }

  try {
    var invoicesRes = await supabase.from("invoices").select("id, job_ids")
      .eq("status", "paid")
      .lt("photos_expire_at", new Date().toISOString());
    if (invoicesRes.error) throw invoicesRes.error;

    var jobIds = [];
    (invoicesRes.data || []).forEach(function (inv) { jobIds = jobIds.concat(inv.job_ids || []); });
    if (!jobIds.length) {
      res.status(200).json({ cleaned: 0 });
      return;
    }

    var subsRes = await supabase.from("job_submissions").select("job_id, photos")
      .in("job_id", jobIds)
      .is("photos_deleted_at", null);
    if (subsRes.error) throw subsRes.error;

    var cleaned = 0;
    for (var i = 0; i < (subsRes.data || []).length; i++) {
      var sub = subsRes.data[i];
      // Older demo photos were saved inline in the row; those just get cleared.
      var paths = (sub.photos || []).map(storagePath).filter(Boolean);
      if (paths.length) {
        var removeRes = await supabase.storage.from(BUCKET).remove(paths);
        if (removeRes.error) {
          console.error("Couldn't delete photos for job", sub.job_id, removeRes.error);
          continue;
        }
      }
      var updateRes = await supabase.from("job_submissions")
        .update({ photos: [], photos_deleted_at: new Date().toISOString() })
        .eq("job_id", sub.job_id);
      if (updateRes.error) {
        console.error("Couldn't mark photos deleted for job", sub.job_id, updateRes.error);
        continue;
      }
      cleaned++;
    }

    res.status(200).json({ cleaned: cleaned });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
